import * as ts from "typescript";

export function getId(node: ts.CallExpression) {
  const expression = node.expression as ts.PropertyAccessExpression;
  const name = expression.name.getText();
  if (name === "t") {
    return 0;
  }
  return parseInt(name.replace("t", ""));
}
