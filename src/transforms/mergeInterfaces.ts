import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

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

export function mergeInterfaces(source: string) {
  const ast = tsquery.ast(source);
  const sourceFile = ast.getSourceFile();

  const getParentInterfaceName = (node: ts.Node): ts.Identifier =>
    ts.isInterfaceDeclaration(node)
      ? node.name
      : getParentInterfaceName(node.parent);

  const knownInterfaces = reduceNodes<Record<string, ts.InterfaceDeclaration>>(
    ast.getChildAt(0),
    (memo, node) => {
      if (ts.isInterfaceDeclaration(node)) {
        return { ...memo, [node.name.text]: node };
      }
      return memo;
    },
    {}
  );

  const dependencies = reduceNodes<Record<string, string[]>>(
    ast.getChildAt(0),
    (memo, node) => {
      if (ts.isTypeReferenceNode(node)) {
        const interfaceName = getParentInterfaceName(node).text;

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

  const someoneDependingOn = Object.values(dependencies).flat();
  const roots = Object.keys(dependencies).filter(
    (type) => !someoneDependingOn.includes(type)
  );

  function interfaceToTypeLiteral(
    node: ts.InterfaceDeclaration | ts.TypeLiteralNode
  ): ts.TypeLiteralNode {
    return ts.factory.createTypeLiteralNode(
      node.members.map(expandTypeElement)
    );
  }

  function expandTypeElement(member: ts.TypeElement) {
    const type = (member as any).type;
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
      if (knownInterfaces[type.elementType.typeName.getText()]) {
        return ts.factory.createPropertySignature(
          undefined,
          member.name!,
          member.questionToken,
          interfaceToTypeLiteral(
            knownInterfaces[type.elementType.typeName.getText()]
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
    .map((node: ts.InterfaceDeclaration) => {
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
