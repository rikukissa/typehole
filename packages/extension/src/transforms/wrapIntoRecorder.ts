import * as ts from "typescript";

function nodeToParameterExpression(node: ts.Node): ts.Expression {
  if (ts.isFunctionDeclaration(node)) {
    return ts.factory.createFunctionExpression(
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.typeParameters,
      node.parameters,
      node.type,
      node.body!
    );
  }

  if (ts.isExpressionStatement(node)) {
    return node.expression;
  }
  return node as ts.Expression;
}

export function wrapIntoRecorder(id: number, node: ts.Node) {
  const sourceFile = node.getSourceFile();

  let rootNode: ts.Node = node;

  while (
    ts.isSourceFile(rootNode) ||
    ts.SyntaxKind[rootNode.kind] === "SyntaxList"
  ) {
    rootNode = rootNode.getChildAt(0);
  }

  const wrapped = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier("typehole"),
      ts.factory.createIdentifier(`t${id === 0 ? "" : id}`)
    ),
    undefined,
    [nodeToParameterExpression(rootNode)]
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    wrapped,
    sourceFile
  );

  return result;
}
