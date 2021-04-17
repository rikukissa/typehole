import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

export function insertTypes(source: string, types: string) {
  const ast = tsquery.ast(source);
  const typeAST = tsquery.ast(types);
  const sourceFile = ast.getSourceFile();

  const existingTypeDeclaration = tsquery.query(
    ast,
    "InterfaceDeclaration > Identifier[name='AutoDiscover']"
  );

  function transformer(ctx: ts.TransformationContext) {
    let firstNonImport = false;

    return function transform(source: ts.SourceFile) {
      function visitor(node: ts.Node): ts.Node | ts.Node[] {
        if (ts.isSourceFile(node)) {
          return ts.visitEachChild(node, visitor, ctx);
        }

        if (existingTypeDeclaration.length === 0) {
          if (firstNonImport) {
            return node;
          }
          if (!ts.isImportDeclaration(node)) {
            firstNonImport = true;

            return [...typeAST.getChildAt(0).getChildren(), node];
          }
        } else if (node === existingTypeDeclaration[0].parent) {
          return typeAST.getChildAt(0).getChildren();
        }

        return node;
      }
      return ts.visitNode(source, visitor);
    };
  }

  const transformed = ts.transform(ast, [transformer]);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    transformed.transformed[0],
    sourceFile
  );

  return result;
}
