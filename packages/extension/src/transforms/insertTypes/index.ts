import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";
import { findTypeholes, printAST } from "../../parse/module";
import { unique } from "../../parse/utils";

function findDeclarationsWithName(name: string, ast: ts.Node) {
  return tsquery.query<ts.InterfaceDeclaration | ts.TypeAliasDeclaration>(
    ast,
    `:declaration > Identifier[name="${name}"]`
  );
}

function findDeclarationWithName(name: string, ast: ts.Node): ts.Node | null {
  const results = findDeclarationsWithName(name, ast);
  if (results.length === 0) {
    return null;
  }
  return results[0];
}
export function getAllDependencyTypeDeclarations(
  node: ts.Node
): Array<ts.InterfaceDeclaration | ts.TypeAliasDeclaration> {
  return findAllDependencyTypeDeclarations(node).filter(unique);
}

export function findAllDependencyTypeDeclarations(
  node: ts.Node,
  found: ts.Node[] = []
): Array<ts.InterfaceDeclaration | ts.TypeAliasDeclaration> {
  // To prevent recursion in circular types
  if (found.includes(node)) {
    return [];
  }

  if (ts.isTypeAliasDeclaration(node)) {
    if (ts.isTypeLiteralNode(node.type)) {
      return [
        node,
        ...node.type.members.flatMap((m: any) =>
          findAllDependencyTypeDeclarations(m.type, [...found, node])
        ),
      ];
    } else {
      return [
        node,
        ...findAllDependencyTypeDeclarations(node.type, [...found, node]),
      ];
    }
  }

  // interface Bar { a: Foo }
  if (ts.isInterfaceDeclaration(node)) {
    return [
      node,
      ...node.members.flatMap((m: any) =>
        findAllDependencyTypeDeclarations(m.type, [...found, node])
      ),
    ];
  }

  // { a: Foo }
  if (ts.isTypeLiteralNode(node)) {
    return node.members.flatMap((m: any) =>
      findAllDependencyTypeDeclarations(m.type, [...found])
    );
  }

  // Foo, Array<Foo>
  if (ts.isTypeReferenceNode(node)) {
    // Array<Foo, Bar>
    const isArrayWrappedType = node.typeArguments !== undefined;
    if (isArrayWrappedType) {
      return node.typeArguments!.flatMap((arg) =>
        findAllDependencyTypeDeclarations(arg, [...found])
      );
    }

    const declarations = findDeclarationsWithName(
      node.typeName.getText(),
      node.getSourceFile()
    );

    return [
      ...declarations.flatMap((n) =>
        findAllDependencyTypeDeclarations(n.parent, [...found])
      ),
    ];
  }
  if (ts.isArrayTypeNode(node)) {
    if (ts.isTypeReferenceNode(node.elementType)) {
      return findAllDependencyTypeDeclarations(node.elementType, [...found]);
    }
    // (A | B)[]
    if (ts.isParenthesizedTypeNode(node.elementType)) {
      return findAllDependencyTypeDeclarations(node.elementType.type, [
        ...found,
      ]);
    }
  }

  // IRootObjectItem[] | (string | boolean | number)[];
  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap((t) => {
      const declarations = findDeclarationsWithName(
        ts.isArrayTypeNode(t) ? t.elementType.getText() : t.getText(),
        t.getSourceFile()
      );

      return [
        ...declarations.flatMap((n) =>
          findAllDependencyTypeDeclarations(n.parent, [...found])
        ),
      ];
    });
  }
  if (
    ts.isArrayTypeNode(node) &&
    ts.isParenthesizedTypeNode(node.elementType)
  ) {
    if (ts.isUnionTypeNode(node.elementType.type)) {
      return node.elementType.type.types.flatMap((t) =>
        findDeclarationsWithName(t.getText(), t.getSourceFile())
      );
    }
  }
  return [];
}

export function getTypeAliasForId(id: string, ast: ts.Node) {
  const holes = findTypeholes(ast);

  const hole = holes.find(
    (h) =>
      ts.isPropertyAccessExpression(h.expression) &&
      h.expression.name.getText() === id
  );

  if (!hole) {
    return;
  }

  const holeHasTypeVariable =
    ts.isCallExpression(hole) &&
    hole.typeArguments &&
    hole.typeArguments.length > 0;

  if (holeHasTypeVariable) {
    const typeReference = hole.typeArguments![0].getText();
    return findDeclarationWithName(typeReference, ast);
  }
  const variableDeclaration = getWrappingVariableDeclaration(hole);

  const holeIsValueInVariableDeclaration =
    variableDeclaration &&
    ts.isVariableDeclaration(variableDeclaration) &&
    variableDeclaration.type;

  if (holeIsValueInVariableDeclaration) {
    const typeReference = (
      variableDeclaration as ts.VariableDeclaration
    ).type!.getText();
    return findDeclarationWithName(typeReference, ast);
  }

  return null;
}

export function getWrappingVariableDeclaration(
  node: ts.Node
): ts.VariableDeclaration | null {
  if (ts.isVariableDeclaration(node)) {
    return node;
  }

  if (ts.isSourceFile(node.parent)) {
    return null;
  }

  if (ts.isArrayLiteralExpression(node.parent)) {
    return null;
  }
  if (ts.isObjectLiteralExpression(node.parent)) {
    return null;
  }

  if (node.parent) {
    return getWrappingVariableDeclaration(node.parent);
  }
  return null;
}

export function insertTypeReference(
  node: ts.Node,
  typeId: string,
  sourceFile: ts.SourceFile
) {
  if (ts.isVariableDeclaration(node)) {
    const newVariableDeclaration = ts.factory.createVariableDeclaration(
      node.name,
      node.exclamationToken,
      ts.factory.createTypeReferenceNode(typeId),
      node.initializer
    );

    return printAST(newVariableDeclaration, sourceFile);
  }
  return null;
}
export function insertGenericTypeParameter(
  node: ts.Node,
  typeId: string,
  sourceFile: ts.SourceFile
) {
  if (ts.isCallExpression(node)) {
    const newCallExpression = ts.factory.createCallExpression(
      node.expression,
      [
        ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(typeId),
          undefined
        ),
      ],
      node.arguments
    );

    return printAST(newCallExpression, sourceFile);
  }
  return null;
}
