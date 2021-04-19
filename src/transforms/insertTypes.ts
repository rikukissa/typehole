import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";
import {
  findTypeholeFactories,
  findTypeholes,
  getNodeEndPosition,
  printAST,
  getNodeStartPosition,
} from "../parse/module";

function lineCharacterPositionInText(
  lineChar: ts.LineAndCharacter,
  text: string
) {
  const rows = text.split("\n");

  const allLines = rows.slice(0, lineChar.line + 1);
  allLines[allLines.length - 1] = allLines[allLines.length - 1].substr(
    0,
    lineChar.character
  );

  return allLines.join("\n").length;
}

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

export function insertTypes(id: number, source: string, types: string) {
  const ast = tsquery.ast(source);
  const typeId = `AutoDiscover${id === 0 ? "" : id}`;
  const typeString = types.trim().replace("AutoDiscover", typeId);

  const existingTypeDeclaration = tsquery.query(
    ast,
    `InterfaceDeclaration > Identifier[name='${typeId}']`
  );
  let newSource = source;
  if (existingTypeDeclaration.length > 0) {
    newSource = replace(source, existingTypeDeclaration[0].parent, typeString);
  } else {
    const factory = findTypeholeFactories(ast)[id];

    newSource = insertBefore(source, factory, `${typeString}\n`);
  }
  const newAST = tsquery.ast(newSource);
  const holes = findTypeholes(newAST);
  const hole = holes[id];

  if (!hole) {
    console.error("Cannot find typehole with an id", id);
    return newSource;
  }

  if (ts.isVariableDeclaration(hole.parent)) {
    const existingType = tsquery.query(
      hole.parent,
      `TypeReference > Identifier[name='${typeId}']`
    );
    if (existingType.length === 0) {
      const newVariableDeclaration = ts.factory.createVariableDeclaration(
        hole.parent.name,
        hole.parent.exclamationToken,
        ts.factory.createTypeReferenceNode(typeId),
        hole.parent.initializer
      );

      newSource = replace(
        newSource,
        hole.parent,
        printAST(newVariableDeclaration, newAST.getSourceFile())
      );
    }
  }

  return newSource;
}
