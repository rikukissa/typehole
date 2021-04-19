import * as assert from "assert";
import { isExpression } from "../../parse/expression";
import { findTypeholes } from "../../parse/module";

import { insertTypes } from "../../transforms/insertTypes";
import { mergeInterfaces } from "../../transforms/mergeInterfaces";
import { wrapIntoRecorder } from "../../transforms/wrapIntoRecorder";

test("generated types are placed between after imports", () => {
  const actual = insertTypes(
    0,
    `
import typehole from 'typehole';
const t = typehole();
const something = t({a: 1});`,

    `interface AutoDiscover {
  a: number
}`
  );

  const expected = `
import typehole from 'typehole';
interface AutoDiscover {
  a: number
}
const t = typehole();
const something: AutoDiscover = t({ a: 1 });`;

  assert.strictEqual(actual.trim(), expected.trim());
});

test("generated types are placed between after imports", () => {
  const actual = insertTypes(
    0,
    `
import typehole from 'typehole';
const t = typehole();
const something = t({a: 1});`,

    `interface AutoDiscover {
  a: number
}`
  );

  const expected = `
import typehole from 'typehole';
interface AutoDiscover {
  a: number
}
const t = typehole();
const something: AutoDiscover = t({ a: 1 });`;

  assert.strictEqual(actual.trim(), expected.trim());
});

test("generated types are updated in-place", () => {
  const actual = insertTypes(
    0,
    `
interface AutoDiscover {
    a: number;
}
const t = typehole();
const something: AutoDiscover = t({ a: 1 });`,
    `
interface AutoDiscover {
  a: number;
  b: number;
}
  `
  );

  const expected = `
interface AutoDiscover {
  a: number;
  b: number;
}
const t = typehole();
const something: AutoDiscover = t({ a: 1 });`;

  assert.strictEqual(actual.trim(), expected.trim());
});

test("merges interfaces", () => {
  const actual = mergeInterfaces(
    `
      interface A {
        e: number,
        b: B
        e: {
          d: D
        }
      }

      interface B {
        c: C
      }

      interface C {
        d: number
      }

      interface D {
        foo: boolean
      }
  `
  );

  const expected = `
  interface A {
    e: number;
    b: {
        c: {
            d: number;
        };
    };
    e: {
        d: {
            foo: boolean;
        };
    };
}
    `;

  assert.strictEqual(actual, expected.trim());
});
test("merge simple", () => {
  const actual = mergeInterfaces(
    `
    interface AutoDiscover1 {  foo: number;}
  `
  );

  const expected = `interface AutoDiscover1 {
    foo: number;
}`;

  assert.strictEqual(actual.trim(), expected.trim());
});
test("merges large interfaces", () => {
  const actual = mergeInterfaces(
    `
    interface AutoDiscover {  countOfAllResults: number;  announcements: Announcement[];}interface Announcement {  id: number;  friendlyId: string;  addressLine1: string;  addressLine2: string;  location: string;  constructionFinishedYear: number;  publishingTime: number;  publishedOrUpdatedAt: number;  mainImageUri: string;  mainImageHidden?: boolean;  searchPrice: number;  notifyPriceChanged: boolean;  hasOpenBidding: boolean;  office?: Office;  newBuilding: boolean;  roomStructure: string;  area: number;  totalArea?: number;  propertyType: string;  propertySubtype: string;  published: boolean;  showBiddingIndicators: boolean;  priceChange: number;  priceChangeActive: boolean;  showPriceChangeIndicators: boolean;  hasPanorama?: boolean;  hasVideo?: boolean;  nextShowings?: NextShowing[];  developmentPhase?: string;}interface NextShowing {  date: number;  startHour: number;  endHour: number;}interface Office {  id: number;  logoUri?: string;  webPageUrl?: string;  name: string;  customerGroupId: number;}
  `
  );

  const expected = `
  interface AutoDiscover {
    countOfAllResults: number;
    announcements: {
        id: number;
        friendlyId: string;
        addressLine1: string;
        addressLine2: string;
        location: string;
        constructionFinishedYear: number;
        publishingTime: number;
        publishedOrUpdatedAt: number;
        mainImageUri: string;
        mainImageHidden?: boolean;
        searchPrice: number;
        notifyPriceChanged: boolean;
        hasOpenBidding: boolean;
        office?: {
            id: number;
            logoUri?: string;
            webPageUrl?: string;
            name: string;
            customerGroupId: number;
        };
        newBuilding: boolean;
        roomStructure: string;
        area: number;
        totalArea?: number;
        propertyType: string;
        propertySubtype: string;
        published: boolean;
        showBiddingIndicators: boolean;
        priceChange: number;
        priceChangeActive: boolean;
        showPriceChangeIndicators: boolean;
        hasPanorama?: boolean;
        hasVideo?: boolean;
        nextShowings?: {
            date: number;
            startHour: number;
            endHour: number;
        };
        developmentPhase?: string;
    };
}
      `;

  assert.strictEqual(actual, expected.trim());
});

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

test("wraps expressions into recorder call", () => {
  const actual = wrapIntoRecorder(
    0,
    `
  tsquery.query(
    ast,
    "InterfaceDeclaration > Identifier[name='AutoDiscover']"
  )
  `
  );
  const expected = `t(tsquery.query(ast, \"InterfaceDeclaration > Identifier[name='AutoDiscover']\"))`;
  assert.strictEqual(actual, expected);
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
