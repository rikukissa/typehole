import { tsquery } from "@phenomnomnominal/tsquery";
import * as assert from "assert";
import ts = require("typescript");
import { isExpression } from "../../parse/expression";
import { findTypeholes, printAST } from "../../parse/module";
import {
  getDescendantAtRange,
  lineCharacterPositionInText,
} from "../../parse/utils";
import { getAllDependencyTypeDeclarations } from "../../transforms/insertTypes";

import { mergeInterfaces } from "../../transforms/mergeInterfaces";
import { wrapIntoRecorder } from "../../transforms/wrapIntoRecorder";

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
test.only("merges interfaces", () => {
  const actual = mergeInterfaces(
    `
    interface IRootObjectItem {
      kind: string;
      data: IData;
    }
    interface IData {
      modhash?: string;
      dist?: number;
      children?: IChildrenItem[];
      after?: string;
      before?: null;
      approved_at_utc?: null;
      subreddit?: string;
      selftext?: string;
      author_fullname?: string;
      saved?: boolean;
      mod_reason_title?: null;
      gilded?: number;
      clicked?: boolean;
      title?: string;
      link_flair_richtext?: any[];
      subreddit_name_prefixed?: string;
      hidden?: boolean;
      pwls?: number;
      link_flair_css_class?: string | null;
      downs?: number;
      thumbnail_height?: number;
      top_awarded_type?: string | null;
      hide_score?: boolean;
      name?: string;
      quarantine?: boolean;
      link_flair_text_color?: string;
      upvote_ratio?: number;
      author_flair_background_color?: null;
      subreddit_type?: string;
      ups?: number;
      total_awards_received?: number;
      media_embed?: IMedia_embed;
      thumbnail_width?: number;
      author_flair_template_id?: null;
      is_original_content?: boolean;
      user_reports?: any[];
      secure_media?: ISecure_media;
      is_reddit_media_domain?: boolean;
      is_meta?: boolean;
      category?: null;
      secure_media_embed?: ISecure_media_embed;
      link_flair_text?: string | null;
      can_mod_post?: boolean;
      score?: number;
      approved_by?: null;
      author_premium?: boolean;
      thumbnail?: string;
      edited?: boolean;
      author_flair_css_class?: null;
      author_flair_richtext?: any[];
      gildings?: IGildings;
      post_hint?: string;
      content_categories?: null;
      is_self?: boolean;
      mod_note?: null;
      created?: number;
      link_flair_type?: string;
      wls?: number;
      removed_by_category?: null;
      banned_by?: null;
      author_flair_type?: string;
      domain?: string;
      allow_live_comments?: boolean;
      selftext_html?: null;
      likes?: null;
      suggested_sort?: null;
      banned_at_utc?: null;
      url_overridden_by_dest?: string;
      view_count?: null;
      archived?: boolean;
      no_follow?: boolean;
      is_crosspostable?: boolean;
      pinned?: boolean;
      over_18?: boolean;
      preview?: IPreview;
      all_awardings?: IAllAwardingsItem[];
      awarders?: any[];
      media_only?: boolean;
      link_flair_template_id?: string;
      can_gild?: boolean;
      spoiler?: boolean;
      locked?: boolean;
      author_flair_text?: null;
      treatment_tags?: any[];
      visited?: boolean;
      removed_by?: null;
      num_reports?: null;
      distinguished?: null;
      subreddit_id?: string;
      mod_reason_by?: null;
      removal_reason?: null;
      link_flair_background_color?: string;
      id?: string;
      is_robot_indexable?: boolean;
      report_reasons?: null;
      author?: string;
      discussion_type?: null;
      num_comments?: number;
      send_replies?: boolean;
      whitelist_status?: string;
      contest_mode?: boolean;
      mod_reports?: any[];
      author_patreon_flair?: boolean;
      author_flair_text_color?: null;
      permalink?: string;
      parent_whitelist_status?: string;
      stickied?: boolean;
      url?: string;
      subreddit_subscribers?: number;
      created_utc?: number;
      num_crossposts?: number;
      media?: IMedia;
      is_video?: boolean;
    }
    interface IChildrenItem {
      kind: string;
      data: IData;
    }
    interface IMedia_embed {
      content: string;
      width: number;
      scrolling: boolean;
      height: number;
    }
    interface ISecure_media {
      oembed: IOembed;
      type: string;
    }
    interface IOembed {
      provider_url: string;
      description?: string;
      title: string;
      author_name: string;
      height: number;
      width: number;
      html: string;
      thumbnail_width: number;
      version: string;
      provider_name: string;
      thumbnail_url: string;
      type: string;
      thumbnail_height: number;
      author_url?: string;
      url?: string;
    }
    interface ISecure_media_embed {
      content: string;
      width: number;
      scrolling: boolean;
      media_domain_url: string;
      height: number;
    }
    interface IGildings {
      gid_1?: number;
      gid_3?: number;
      gid_2?: number;
    }
    interface IPreview {
      images: IImagesItem[];
      enabled: boolean;
    }
    interface IImagesItem {
      source: ISource;
      resolutions: IResolutionsItem[];
      variants: IVariants;
      id: string;
    }
    interface ISource {
      url: string;
      width: number;
      height: number;
    }
    interface IResolutionsItem {
      url: string;
      width: number;
      height: number;
    }
    interface IVariants {}
    interface IAllAwardingsItem {
      giver_coin_reward: null | number;
      subreddit_id: null;
      is_new: boolean;
      days_of_drip_extension: number;
      coin_price: number;
      id: string;
      penny_donate: null | number;
      award_sub_type: string;
      coin_reward: number;
      icon_url: string;
      days_of_premium: number;
      tiers_by_required_awardings: null | ITiers_by_required_awardings;
      resized_icons: IResizedIconsItem[];
      icon_width: number;
      static_icon_width: number;
      start_date: null;
      is_enabled: boolean;
      awardings_required_to_grant_benefits: null | number;
      description: string;
      end_date: null;
      subreddit_coin_reward: number;
      count: number;
      static_icon_height: number;
      name: string;
      resized_static_icons: IResizedStaticIconsItem[];
      icon_format: string | null;
      icon_height: number;
      penny_price: null | number;
      award_type: string;
      static_icon_url: string;
    }
    interface IResizedIconsItem {
      url: string;
      width: number;
      height: number;
    }
    interface IResizedStaticIconsItem {
      url: string;
      width: number;
      height: number;
    }
    interface IMedia {
      oembed: IOembed;
      type: string;
    }
    interface ITiers_by_required_awardings {
      0: I0;
      5: I5;
      10: I10;
      25: I25;
    }
    interface I0 {
      resized_icons: IResizedIconsItem[];
      awardings_required: number;
      static_icon: IStatic_icon;
      resized_static_icons: IResizedStaticIconsItem[];
      icon: IIcon;
    }
    interface IStatic_icon {
      url: string;
      width: number;
      format: null;
      height: number;
    }
    interface IIcon {
      url: string;
      width: number;
      format: string;
      height: number;
    }
    interface I5 {
      resized_icons: IResizedIconsItem[];
      awardings_required: number;
      static_icon: IStatic_icon;
      resized_static_icons: IResizedStaticIconsItem[];
      icon: IIcon;
    }
    interface I10 {
      resized_icons: IResizedIconsItem[];
      awardings_required: number;
      static_icon: IStatic_icon;
      resized_static_icons: IResizedStaticIconsItem[];
      icon: IIcon;
    }
    interface I25 {
      resized_icons: IResizedIconsItem[];
      awardings_required: number;
      static_icon: IStatic_icon;
      resized_static_icons: IResizedStaticIconsItem[];
      icon: IIcon;
    }

  `
  );
  console.log(actual);

  // expect(actual).toMatchSnapshot();
});

test("merges interfaces with type unions", () => {
  const actual = mergeInterfaces(
    `
    type IRootObject = {a: A};
    type A = number[];
  `
  );

  const expected = `{
    a: number[];
}
        `;

  assert.strictEqual(actual.trim(), expected.trim());
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
test("XXX", () => {
  const source = `import React, { useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

function App() {
  useEffect(() => {
    async function fetchVideos() {
      const res = await fetch("https://www.reddit.com/r/videos.json");
      const data = await res.json();

      console.log(data);
    }
    fetchVideos();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
    `.trim();
  const ast = tsquery.ast(source);

  const actual = getDescendantAtRange(ast.getSourceFile(), [184, 235]);
  console.log(ts.SyntaxKind[actual.kind]);
});
test("XXX", () => {
  const source = `import React, { useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

function App() {
  useEffect(() => {
    async function fetchVideos() {
      const res = await fetch("https://www.reddit.com/r/videos.json");
      const data = await res.json();

      console.log(data);
    }
    fetchVideos();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;`;

  assert.strictEqual(
    lineCharacterPositionInText(
      {
        line: 7,
        character: 18,
      },
      source
    ),
    184
  );
});

test("Finds all dependency type nodes from an AST", () => {
  const ast = tsquery.ast(`type Something = {
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
