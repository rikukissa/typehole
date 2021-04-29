import { tsquery } from "@phenomnomnominal/tsquery";
import * as assert from "assert";

import { findTypeholes, getAST } from "./parse/module";

import { getAllDependencyTypeDeclarations } from "./transforms/insertTypes";

test("finds all typewholes from source", () => {
  const actual = findTypeholes(`
  import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import typehole from "typehole";

export default async (request: VercelRequest, response: VercelResponse) => {
  const xsrf = await getXSRF();
  const res = typehole.t(
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
