import * as assert from "assert";

import { mergeInterfaces } from "./index";

test("merges interfaces simple", () => {
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

  expect(actual).toMatchSnapshot();
});

test("merges complex interfaces", () => {
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

  expect(actual).toMatchSnapshot();
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
test("leaves interfaces intact if theres nothing to merge", () => {
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

test("handles array types correctly", () => {
  const actual = mergeInterfaces(
    `
  interface IRootObject {
    total_currencies: ITotalCurrenciesItem[];

  }
  interface ITotalCurrenciesItem {
      currency: string;
      amount: number;
  }
  `
  );

  expect(actual).toMatchSnapshot();
});
