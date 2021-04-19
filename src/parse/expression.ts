import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

export function isExpression(text: string) {
  const ast = tsquery.ast(text);
  const selectedNodes = ast.getChildAt(0).getChildren();

  const onlyExpressionAndEndOfFile =
    selectedNodes.length === 1 && ts.isExpressionStatement(selectedNodes[0]);

  if (onlyExpressionAndEndOfFile) {
    return true;
  }
  return false;
}
