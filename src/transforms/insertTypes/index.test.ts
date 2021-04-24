import { getAST } from "../../parse/module";

import { getAllDependencyTypeDeclarations, getTypeAliasForId } from "./index";

test("finds all dependency type declarations from an ast when given one interface", () => {
  const ast = getAST(file);
  const typeAliasNode = getTypeAliasForId("t", ast)!;

  expect(
    getAllDependencyTypeDeclarations(typeAliasNode.parent).map((n) =>
      n.name.getText()
    )
  ).toEqual(["Reddit", "IData", "IChildrenItem"]);
});

const file = `
import React, { useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";
import typehole from "typehole";

interface Reddit {
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
  link_flair_css_class?: null;
  downs?: number;
  thumbnail_height?: number;
  top_awarded_type?: null;
  hide_score?: boolean;
  name?: string;
  quarantine?: boolean;
  link_flair_text_color?: string;
  upvote_ratio?: number;
  author_flair_background_color?: null;
  subreddit_type?: string;
  ups?: number;
  total_awards_received?: number;
  media_embed?: {
    content: string;
    width: number;
    scrolling: boolean;
    height: number;
  };
  thumbnail_width?: number;
  author_flair_template_id?: null;
  is_original_content?: boolean;
  user_reports?: any[];
  secure_media?: {
    oembed: {
      provider_url: string;
      title: string;
      html: string;
      thumbnail_width: number;
      height: number;
      width: number;
      version: string;
      author_name: string;
      provider_name: string;
      thumbnail_url: string;
      type: string;
      thumbnail_height: number;
      author_url: string;
    };
    type: string;
  };
  is_reddit_media_domain?: boolean;
  is_meta?: boolean;
  category?: null;
  secure_media_embed?: {
    content: string;
    width: number;
    scrolling: boolean;
    media_domain_url: string;
    height: number;
  };
  link_flair_text?: null;
  can_mod_post?: boolean;
  score?: number;
  approved_by?: null;
  author_premium?: boolean;
  thumbnail?: string;
  edited?: boolean;
  author_flair_css_class?: null;
  author_flair_richtext?: any[];
  gildings?: {
    gid_1?: number;
    gid_2?: number;
  };
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
  preview?: {
    images: {
      source: {
        url: string;
        width: number;
        height: number;
      };
      resolutions: {
        url: string;
        width: number;
        height: number;
      };
      variants: {};
      id: string;
    };
    enabled: boolean;
  };
  all_awardings?: {
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
    tiers_by_required_awardings: null;
    resized_icons: {
      url: string;
      width: number;
      height: number;
    };
    icon_width: number;
    static_icon_width: number;
    start_date: null;
    is_enabled: boolean;
    awardings_required_to_grant_benefits: null;
    description: string;
    end_date: null;
    subreddit_coin_reward: number;
    count: number;
    static_icon_height: number;
    name: string;
    resized_static_icons: {
      url: string;
      width: number;
      height: number;
    };
    icon_format: null | string;
    icon_height: number;
    penny_price: null | number;
    award_type: string;
    static_icon_url: string;
  };
  awarders?: any[];
  media_only?: boolean;
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
  media?: {
    oembed: {
      provider_url: string;
      title: string;
      html: string;
      thumbnail_width: number;
      height: number;
      width: number;
      version: string;
      author_name: string;
      provider_name: string;
      thumbnail_url: string;
      type: string;
      thumbnail_height: number;
      author_url: string;
    };
    type: string;
  };
  is_video?: boolean;
}
interface IChildrenItem {
  kind: string;
  data: IData;
}

type Numberz = number;

function App() {
  useEffect(() => {
    async function fetchVideos() {
      const res = await fetch("https://www.reddit.com/r/videos.json");

      const data: Reddit = typehole.t(await res.json());

      const a: Numberz = typehole.t1(1 + 1);
      console.log(a, data);
    }
    fetchVideos();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload
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

`;
