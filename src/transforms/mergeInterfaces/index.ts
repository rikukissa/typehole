import * as ts from "typescript";
import { getAST } from "../../parse/module";
import { unique } from "../../parse/utils";

function reduceNodes<T>(
  node: ts.Node,
  op: (memo: T, node: ts.Node) => T,
  defaultValue: T
): T {
  const children = node.getChildren();

  return children.reduce((memo, child) => {
    const newVal = op(memo, child);
    return reduceNodes(child, op, newVal);
  }, defaultValue);
}

function isType(
  node: ts.Node
): node is ts.TypeAliasDeclaration | ts.InterfaceDeclaration {
  return ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node);
}

export type KnownTypeLiteralNode =
  | ts.KeywordTypeNode
  | ts.LiteralTypeNode
  | ts.ArrayTypeNode
  | ts.TypeQueryNode;

function findCircularDependencies(allDependencies: Record<string, string[]>) {
  const circular: [string, string][] = [];
  const entries = Object.entries(allDependencies);
  for (const [key, deps] of entries) {
    for (const [key2, deps2] of entries) {
      if (deps2.includes(key) && deps.includes(key2)) {
        circular.push([key, key2]);
      }
    }
  }
  return circular;
}

export const transformLiteralToTypeLiteralNode = (
  node: ts.Node
): KnownTypeLiteralNode | undefined => {
  if (ts.isIdentifier(node)) {
    ts.factory.createTypeQueryNode(ts.factory.createIdentifier(node.text));
  }

  // is arrray what ever
  if (ts.isArrayTypeNode(node)) {
    return ts.factory.createArrayTypeNode(node.elementType);
  }

  if (ts.isNumericLiteral(node)) {
    return ts.factory.createLiteralTypeNode(
      ts.factory.createNumericLiteral(node.text)
    );
  }

  if (ts.isStringLiteral(node)) {
    return ts.factory.createLiteralTypeNode(
      ts.factory.createStringLiteral(node.text)
    );
  }

  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return ts.factory.createLiteralTypeNode(ts.factory.createNull());
  }

  if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
  }

  return undefined;
};

export function mergeInterfaces(source: string) {
  const ast = getAST(source);
  const sourceFile = ast.getSourceFile();

  const getParentInterfaceName = (node: ts.Node): ts.Identifier =>
    isType(node) ? node.name : getParentInterfaceName(node.parent);

  const knownInterfaces = reduceNodes<
    Record<string, ts.TypeAliasDeclaration | ts.InterfaceDeclaration>
  >(
    ast.getChildAt(0),
    (memo, node) => {
      if (isType(node)) {
        return { ...memo, [node.name.getText()]: node };
      }
      return memo;
    },
    {}
  );

  const dependencies = reduceNodes<Record<string, string[]>>(
    ast.getChildAt(0),
    (memo, node) => {
      if (ts.isTypeReferenceNode(node)) {
        const interfaceName = getParentInterfaceName(node).getText();

        return {
          ...memo,
          [interfaceName]: memo[interfaceName]
            ? memo[interfaceName].concat(node.getText())
            : [node.getText()],
        };
      }
      return memo;
    },
    Object.fromEntries(Object.keys(knownInterfaces).map((key) => [key, []]))
  );

  const needsToBeAtRoot = findCircularDependencies(dependencies).flat();

  const someoneDependingOn = Object.values(dependencies).flat();
  const roots = Object.keys(dependencies)
    .filter((type) => !someoneDependingOn.includes(type))
    .concat(needsToBeAtRoot)
    .filter(unique);

  function interfaceToTypeLiteral(
    node: ts.InterfaceDeclaration | ts.TypeLiteralNode | ts.TypeAliasDeclaration
  ): ts.TypeLiteralNode | KnownTypeLiteralNode {
    if (ts.isTypeAliasDeclaration(node)) {
      if (ts.isTypeLiteralNode(node.type)) {
        return ts.factory.createTypeLiteralNode(
          node.type.members.map(expandTypeElement)
        );
      } else {
        return transformLiteralToTypeLiteralNode(node.type)!;
      }
    }

    return ts.factory.createTypeLiteralNode(
      node.members.map(expandTypeElement)
    );
  }

  function expandTypeElement(member: ts.TypeElement) {
    const type = (member as any).type;

    if (roots.includes(type.getText())) {
      return member;
    }

    if (ts.isTypeReferenceNode(type)) {
      if (knownInterfaces[type.typeName.getText()]) {
        return ts.factory.createPropertySignature(
          undefined,
          member.name as ts.PropertyName,
          member.questionToken,
          interfaceToTypeLiteral(knownInterfaces[type.typeName.getText()])
        );
      }
    }
    if (ts.isTypeLiteralNode(type)) {
      return ts.factory.createPropertySignature(
        undefined,
        member.name!,
        member.questionToken,
        interfaceToTypeLiteral(type)
      );
    }

    if (ts.isArrayTypeNode(type) && ts.isTypeReferenceNode(type.elementType)) {
      if (roots.includes(type.elementType.getText())) {
        return member;
      }

      if (knownInterfaces[type.elementType.typeName.getText()]) {
        return ts.factory.createPropertySignature(
          undefined,
          member.name!,
          member.questionToken,
          ts.factory.createArrayTypeNode(
            interfaceToTypeLiteral(
              knownInterfaces[type.elementType.typeName.getText()]
            )
          )
        );
      }
    }
    if (
      ts.isArrayTypeNode(type) &&
      ts.isParenthesizedTypeNode(type.elementType)
    ) {
      if (ts.isUnionTypeNode(type.elementType.type)) {
        const types = type.elementType.type.types.filter(
          (t) => knownInterfaces[t.getText()]
        );

        return ts.factory.createPropertySignature(
          undefined,
          member.name!,
          member.questionToken,
          ts.factory.createArrayTypeNode(
            ts.factory.createParenthesizedType(
              ts.factory.createUnionTypeNode(
                types.map((t) =>
                  interfaceToTypeLiteral(knownInterfaces[t.getText()])
                )
              )
            )
          )
        );
      }
    }

    return member;
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const mergedInterfaces = roots
    .map((root) => knownInterfaces[root])
    .map((node: ts.TypeAliasDeclaration | ts.InterfaceDeclaration) => {
      if (ts.isTypeAliasDeclaration(node)) {
        if (ts.isTypeLiteralNode(node.type)) {
          return ts.factory.createTypeLiteralNode(
            node.type.members.map(expandTypeElement)
          );
        } else {
          return node;
        }
      }

      return ts.factory.createInterfaceDeclaration(
        undefined,
        undefined,
        node.name,
        undefined,
        undefined,
        node.members.map(expandTypeElement)
      );
    })
    .map((transformed) =>
      printer.printNode(ts.EmitHint.Unspecified, transformed, sourceFile)
    );

  return mergedInterfaces.join("\n");
}
