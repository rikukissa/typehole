import { tsquery } from "@phenomnomnominal/tsquery";
import * as assert from "assert";

import { isExpression } from "./parse/expression";
import { findTypeholes, getAST } from "./parse/module";

import { getAllDependencyTypeDeclarations } from "./transforms/insertTypes";

test("finds selected expression", () => {
  const actual = isExpression(`
  tsquery.query(
    ast,
    "InterfaceDeclaration > Identifier[name='AutoDiscover']"
  )
  `);

  assert.deepStrictEqual(actual, true);
});
test("finds selected expression", () => {
  const actual = isExpression(`
  (await axios.post(
    "https://www.etuovi.com/api/v2/announcements/search/listpage",
    params
  )
).data
  `);

  assert.deepStrictEqual(actual, true);
});

test("returns null on non-expression selection", () => {
  const actual = isExpression(`
  if (!siblings.some((s) => markerStarts.includes(s))) {
    return ts.visitEachChild(node, visitor, ctx);
  }
  `);
  assert.strictEqual(actual, false);
});

test("returns null on non-expression selection", () => {
  const actual = isExpression(`
  .some((s) => markerStarts.includes(s))) {
    return ts.visitEachChild(node, visitor, ctx);
  }
  `);
  assert.strictEqual(actual, false);
});

test("finds all typewholes from source", () => {
  const actual = findTypeholes(`
  import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import typehole from "typehole";

const t3 = typehole();

export default async (request: VercelRequest, response: VercelResponse) => {
  const xsrf = await getXSRF();
  const res = t3(
    (
      await axios.post(
        "https://www.etuovi.com/api/v2/announcements/search/listpage",
        params
      )
    ).data
  );

  return response.status(200).send(res.announcements);
};

  `);
  assert.strictEqual(actual.length, 1);
});

test("Finds all dependency type nodes from an AST", () => {
  const ast = getAST(`type Something = {
    a: B;
  };

  type B = {
    moi: C | D;
  };

  type C = 2;

  type D = 3;`);
  const actual = getAllDependencyTypeDeclarations(
    tsquery.query(ast, ':declaration > Identifier[name="Something"]')[0].parent
  );

  expect(actual.map((n) => n.getText())).toMatchSnapshot();
});
