import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

export function findTypeHoleImport(ast: ts.Node) {
  return tsquery.query(
    ast,
    "ImportDeclaration > StringLiteral[text='typehole']"
  );
}
export function findLastImport(ast: ts.Node) {
  const imports = tsquery.query(ast, "ImportDeclaration");
  return imports[imports.length - 1];
}

export function getNodeEndPosition(node: ts.Node) {
  return node.getSourceFile().getLineAndCharacterOfPosition(node.getEnd());
}
export function getNodeStartPosition(node: ts.Node) {
  return node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
}

export function getTypeHoleImport() {
  const clause = ts.factory.createImportClause(
    false,
    ts.factory.createIdentifier("typehole"),
    undefined
  );
  return printAST(
    ts.factory.createImportDeclaration(
      undefined,
      undefined,
      clause,
      ts.factory.createStringLiteral("typehole")
    )
  );
}

export function getTypeHoleFactoryCall(id: number) {
  return `const t${id === 0 ? "" : id} = typehole()`;
}

export function printAST(ast: ts.Node, sourceFile?: ts.SourceFile) {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  return printer.printNode(
    ts.EmitHint.Unspecified,
    ast,
    sourceFile || ast.getSourceFile()
  );
}

export function findTypeholes(ast: ts.Node | string) {
  const holenames = tsquery
    .query(ast, 'CallExpression > Identifier[name="typehole"]')
    .map((identifier) => identifier.parent.parent as ts.VariableDeclaration)
    .map((decl) => decl.name.getText());

  const holes = holenames.flatMap((name) =>
    tsquery.query(ast, `CallExpression > Identifier[name="${name}"]`)
  );

  return holes.map((n) => n.parent);
}
export function findTypeholeFactories(ast: ts.Node | string) {
  return tsquery
    .query(ast, 'CallExpression > Identifier[name="typehole"]')
    .map((n) => n.parent.parent.parent);
}

export function getAST(source: string) {
  return tsquery.ast(source);
}
