import * as ts from "typescript";

function getStartSafe(node: ts.Node, sourceFile: ts.SourceFile) {
  // workaround for compiler api bug with getStart(sourceFile, true) (see PR #35029 in typescript repo)
  const jsDocs = (node as any).jsDoc as ts.Node[] | undefined;
  if (jsDocs && jsDocs.length > 0) {
    return jsDocs[0].getStart(sourceFile);
  }
  return node.getStart(sourceFile);
}

function allChildren(node: ts.Node): ts.Node[] {
  return node.getChildren();
}

export function getDescendantAtRange(
  sourceFile: ts.SourceFile,
  range: [number, number]
) {
  const syntaxKinds = ts.SyntaxKind;

  let bestMatch: { node: ts.Node; start: number } = {
    node: sourceFile,
    start: sourceFile.getStart(sourceFile),
  };

  searchDescendants(sourceFile);

  return bestMatch.node;

  function searchDescendants(node: ts.Node) {
    const children = allChildren(node);

    for (const child of children) {
      if (child.kind !== syntaxKinds.SyntaxList) {
        if (isBeforeRange(child.end)) {
          continue;
        }

        const childStart = getStartSafe(child, sourceFile);

        if (isAfterRange(childStart)) {
          return;
        }

        const isEndOfFileToken = child.kind === syntaxKinds.EndOfFileToken;
        if (isEndOfFileToken) {
          return;
        }
        const hasSameStart =
          bestMatch.start === childStart && range[0] === childStart;

        if (
          !hasSameStart &&
          Math.abs(range[0] - bestMatch.start) > Math.abs(range[0] - childStart)
        ) {
          bestMatch = { node: child, start: childStart };
        }
      }

      searchDescendants(child);
    }
  }

  function isBeforeRange(pos: number) {
    return pos < range[0];
  }

  function isAfterRange(nodeEnd: number) {
    return nodeEnd >= range[0] && nodeEnd > range[1];
  }
}

export function lineCharacterPositionInText(
  lineChar: ts.LineAndCharacter,
  text: string
) {
  const rows = text.split("\n");

  const allLines = rows.slice(0, lineChar.line + 1);
  allLines[allLines.length - 1] = allLines[allLines.length - 1].substr(
    0,
    lineChar.character
  );

  return allLines.join("\n").length;
}

export function unique<T>(value: T, index: number, self: T[]) {
  return self.indexOf(value) === index;
}

export function omit<T extends {}>(original: T, key: keyof T) {
  const { [key]: value, ...withoutKey } = original;
  return withoutKey;
}
