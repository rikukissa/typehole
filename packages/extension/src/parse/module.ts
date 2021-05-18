import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

export function findTypeHoleImports(ast: ts.Node) {
  return tsquery
    .query(ast, "ImportDeclaration > StringLiteral[text='typehole']")
    .map((s) => s.parent);
}

export function resolveImportPath(
  projectRoot: string,
  moduleName: string,
  containingFile: string
) {
  const configFileName = ts.findConfigFile(
    projectRoot,
    ts.sys.fileExists,
    "tsconfig.json"
  );

  if (!configFileName) {
    return null;
  }

  const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);

  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    "./"
  );

  function fileExists(fileName: string): boolean {
    return ts.sys.fileExists(fileName);
  }

  function readFile(fileName: string): string | undefined {
    return ts.sys.readFile(fileName);
  }

  const result = ts.resolveModuleName(
    moduleName,
    containingFile,
    compilerOptions.options,
    {
      fileExists,
      readFile,
    }
  );

  return result.resolvedModule!.resolvedFileName;
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

export function printAST(ast: ts.Node, sourceFile?: ts.SourceFile) {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  return printer.printNode(
    ts.EmitHint.Unspecified,
    ast,
    sourceFile || ast.getSourceFile()
  );
}

export function findTypeholes(ast: ts.Node | string): ts.CallExpression[] {
  const holes = tsquery.query(
    ast,
    `PropertyAccessExpression > Identifier[name="typehole"]`
  );

  return holes
    .map((n) => n.parent.parent)
    .filter(ts.isCallExpression)
    .sort((a, b) => {
      const keyA = (a.expression as ts.PropertyAccessExpression).name.getText();
      const keyB = (b.expression as ts.PropertyAccessExpression).name.getText();
      return keyA.localeCompare(keyB);
    });
}

export function getAST(source: string) {
  return tsquery.ast(source, "file.ts", ts.ScriptKind.TSX);
}

export function getParentOnRootLevel(node: ts.Node): ts.Node {
  if (ts.isSourceFile(node.parent)) {
    return node;
  }
  return getParentOnRootLevel(node.parent);
}
export function someParentIs(
  node: ts.Node,
  test: (node: ts.Node) => boolean
): boolean {
  if (!node.parent) {
    return false;
  }
  if (test(node.parent)) {
    return true;
  }
  return someParentIs(node.parent, test);
}

export function getParentWithType<T = ts.Node>(
  node: ts.Node,
  kind: ts.SyntaxKind
): T | null {
  if (!node.parent) {
    return null;
  }
  if (node.kind === kind) {
    return node as unknown as T;
  }
  return getParentWithType(node.parent, kind);
}
