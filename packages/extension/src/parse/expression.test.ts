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
