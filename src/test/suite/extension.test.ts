import * as assert from "assert";

import { insertRecorders } from "../../transforms/insertRecorders";
import { insertTypes } from "../../transforms/insertTypes";
import { mergeInterfaces } from "../../transforms/mergeInterfaces";

test("recorders are placed to expression after AutoDiscover reference", () => {
  const actual = insertRecorders(`
import { AutoDiscover } from 'harpake';
const something: AutoDiscover = {a: 1};`);

  const expected = `
import { AutoDiscover } from 'harpake';
const something: AutoDiscover = t({ a: 1 });`;

  assert.strictEqual(actual.trim(), expected.trim());
});

test("generated types are placed between after imports", () => {
  const actual = insertTypes(
    `
import { AutoDiscover } from 'harpake';
const something: AutoDiscover = t({a: 1});`,
    `
interface AutoDiscover {
  a: number
}
  `
  );

  const expected = `
import { AutoDiscover } from 'harpake';
interface AutoDiscover {
    a: number;
}
const something: AutoDiscover = t({ a: 1 });`;

  assert.strictEqual(actual.trim(), expected.trim());
});

test("generated types are updated in-place", () => {
  const actual = insertTypes(
    `
import { AutoDiscover } from 'harpake';
interface AutoDiscover {
    a: number;
}
const something: AutoDiscover = t({ a: 1 });`,
    `
interface AutoDiscover {
  a: number;
  b: number;
}
  `
  );

  const expected = `
import { AutoDiscover } from 'harpake';
interface AutoDiscover {
    a: number;
    b: number;
}
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
