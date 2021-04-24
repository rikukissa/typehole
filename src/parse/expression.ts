import * as ts from "typescript";

import { getAST } from "./module";

export function isExpression(text: string) {
  const ast = getAST(text);
  const selectedNodes = ast.getChildAt(0).getChildren();

  const onlyExpressionAndEndOfFile =
    selectedNodes.length === 1 && ts.isExpressionStatement(selectedNodes[0]);

  if (onlyExpressionAndEndOfFile) {
    return true;
  }
  return false;
}
