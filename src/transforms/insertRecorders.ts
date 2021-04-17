import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

export function insertRecorders(source: string) {
  const ast = tsquery.ast(source);
  const sourceFile = ast.getSourceFile();

  const magicMarkers = tsquery.query(
    ast,
    "TypeReference > Identifier[name='AutoDiscover']"
  );

  if (magicMarkers.length === 0) {
    return source;
  }

  const variableDeclarations = magicMarkers.map((m) => m.parent.parent);
  const markerStarts = magicMarkers.map((m) => m.parent);

  function transformer(ctx: ts.TransformationContext) {
    return function transform(source: ts.SourceFile) {
      function visitor(node: ts.Node): ts.Node | ts.Node[] {
        if (variableDeclarations.includes(node.parent)) {
          const start = node;
          const siblings = start.parent.getChildren();
          const isLast = siblings.indexOf(node) === siblings.length - 1;
          if (!isLast) {
            return ts.visitEachChild(node, visitor, ctx);
          }
          if (!siblings.some((s) => markerStarts.includes(s))) {
            return ts.visitEachChild(node, visitor, ctx);
          }

          return ts.factory.createCallExpression(
            ts.factory.createIdentifier("t"),
            undefined,
            [node as ts.Expression]
          );
        }
        return ts.visitEachChild(node, visitor, ctx);
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
