import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";
import {
  findTypeholeFactories,
  findTypeholes,
  getNodeEndPosition,
  printAST,
  getNodeStartPosition,
} from "../parse/module";
import { lineCharacterPositionInText } from "../parse/utils";

function insertBefore(source: string, node: ts.Node, insert: string) {
  const start = getNodeStartPosition(node);
  const end = getNodeEndPosition(node);

  return (
    source.substr(0, lineCharacterPositionInText(start, source)) +
    insert +
    source.substr(lineCharacterPositionInText(start, source))
  );
}

function replace(source: string, node: ts.Node, replacement: string) {
  const start = getNodeStartPosition(node);
  const end = getNodeEndPosition(node);

  return (
    source.substr(0, lineCharacterPositionInText(start, source)) +
    replacement +
    source.substr(lineCharacterPositionInText(end, source))
  );
}

function findDeclarationWithName(name: string, ast: ts.Node): ts.Node | null {
  const results = tsquery.query(ast, `:declaration Identifier[name="${name}"]`);

  if (results.length === 0) {
    return null;
  }

  return results[0];
}

export function getTypeAliasForId(id: number, ast: ts.Node) {
  const hole = findTypeholes(ast)[id];

  let typeReference: string | null = null;
  if (
    ts.isCallExpression(hole) &&
    hole.typeArguments &&
    hole.typeArguments.length > 0
  ) {
    console.log("its a call with generic type");
    typeReference = hole.typeArguments[0].getText();
  }
  const variableDeclaration = getWrappingVariableDeclaration(hole);
  if (
    variableDeclaration &&
    ts.isVariableDeclaration(variableDeclaration) &&
    variableDeclaration.type
  ) {
    console.log("its a variable declaration with type");
    console.log(variableDeclaration);

    typeReference = variableDeclaration.type.getText();
  }

  console.log({ typeReference });
  if (typeReference === null) {
    console.log("No type reference found");
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
