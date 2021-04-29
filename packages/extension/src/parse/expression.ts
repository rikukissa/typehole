import * as ts from "typescript";

export function isValidSelection(selectedNode: ts.Node) {
  const kind = ts.SyntaxKind[selectedNode.kind];
  return (
    kind.includes("Expression") ||
    kind.includes("Literal") ||
    kind.includes("Keyword")
  );
}
