import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";
import { findTypeholes, printAST } from "../parse/module";

function findDeclarationsWithName(name: string, ast: ts.Node): ts.Node[] {
  return tsquery.query(ast, `:declaration > Identifier[name="${name}"]`);
}

function findDeclarationWithName(name: string, ast: ts.Node): ts.Node | null {
  const results = findDeclarationsWithName(name, ast);
  if (results.length === 0) {
    return null;
  }
  return results[0];
}

export function getAllDependencyTypeDeclarations(node: ts.Node): ts.Node[] {
  if (ts.isTypeAliasDeclaration(node)) {
    if (ts.isTypeLiteralNode(node.type)) {
      return [
        node,
        ...node.type.members.flatMap((m: any) =>
          getAllDependencyTypeDeclarations(m.type)
        ),
      ];
    } else {
      return [node];
    }
  }

  if (ts.isInterfaceDeclaration(node)) {
    return [
      node,
      ...node.members.flatMap((m: any) =>
        getAllDependencyTypeDeclarations(m.type)
      ),
    ];
  }

  if (ts.isTypeLiteralNode(node)) {
    return node.members.flatMap((m: any) =>
      getAllDependencyTypeDeclarations(m.type)
    );
  }

  if (ts.isTypeReferenceNode(node)) {
    const declarations = findDeclarationsWithName(
      node.typeName.getText(),
      node.getSourceFile()
    );

    return [
      ...declarations.flatMap((n) =>
        getAllDependencyTypeDeclarations(n.parent)
      ),
    ];
  }
  if (ts.isArrayTypeNode(node) && ts.isTypeReferenceNode(node.elementType)) {
    return getAllDependencyTypeDeclarations(node.elementType);
  }

  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap((t) => {
      const declarations = findDeclarationsWithName(
        t.getText(),
        t.getSourceFile()
      );

      return [
        ...declarations.flatMap((n) =>
          getAllDependencyTypeDeclarations(n.parent)
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

export function getTypeAliasForId(id: number, ast: ts.Node) {
  const holes = findTypeholes(ast);

  const hole = holes[id];

  let typeReference: string | null = null;
  if (
    ts.isCallExpression(hole) &&
    hole.typeArguments &&
    hole.typeArguments.length > 0
  ) {
    typeReference = hole.typeArguments[0].getText();
  }
  const variableDeclaration = getWrappingVariableDeclaration(hole);
  if (
    variableDeclaration &&
    ts.isVariableDeclaration(variableDeclaration) &&
    variableDeclaration.type
  ) {
    typeReference = variableDeclaration.type.getText();
  }

  if (typeReference === null) {
    return null;
  }

  return findDeclarationWithName(typeReference, ast);
}

export function getWrappingVariableDeclaration(node: ts.Node): ts.Node | null {
  if (ts.isVariableDeclaration(node)) {
    return node;
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
