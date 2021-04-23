import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

export function wrapIntoRecorder(id: number, expressionCode: string) {
  const ast = tsquery.ast(expressionCode);
  const sourceFile = ast.getSourceFile();
  const expression = ast.getChildAt(0).getChildAt(0).getChildAt(0);

  const wrapped = ts.factory.createCallExpression(
    ts.factory.createIdentifier(`typehole.t${id === 0 ? "" : id}`),
    undefined,
    [expression as ts.Expression]
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    wrapped,
    sourceFile
  );
  return result;
}
