import { tsquery } from "@phenomnomnominal/tsquery";
import * as assert from "assert";

import { isValidSelection } from "./expression";
import { getAST } from "./module";

const toNode = (str: string) => getAST(str).getChildAt(0).getChildAt(0);

test("finds selected expression", () => {
  const actual = isValidSelection(
    toNode(`
  tsquery.query(
    ast,
    "InterfaceDeclaration > Identifier[name='AutoDiscover']"
  )
  `)
  );

  assert.deepStrictEqual(actual, true);
});

test("finds selected expression", () => {
  const actual = isValidSelection(
    toNode(`
  (await axios.post(
    "https://www.etuovi.com/api/v2/announcements/search/listpage",
    params
  )
).data
  `)
  );

  assert.deepStrictEqual(actual, true);
});

test("returns null on non-expression selection", () => {
  const actual = isValidSelection(
    toNode(`
  if (!siblings.some((s) => markerStarts.includes(s))) {
    return ts.visitEachChild(node, visitor, ctx);
  }
  `)
  );
  assert.strictEqual(actual, false);
});

test("it's ok to select specific values", () => {
  assert.strictEqual(isValidSelection(toNode(`undefined`)), true);
  assert.strictEqual(isValidSelection(toNode(`1`)), true);
  assert.strictEqual(isValidSelection(toNode(`true`)), true);
  assert.strictEqual(
    isValidSelection(
      tsquery.query(toNode(`const a = {a: 3}`), "ObjectLiteralExpression")[0]
    ),
    true
  );
});

test("returns null on non-expression selection", () => {
  const actual = isValidSelection(
    toNode(`
  .some((s) => markerStarts.includes(s))) {
    return ts.visitEachChild(node, visitor, ctx);
  }
  `)
  );
  assert.strictEqual(actual, false);
});
