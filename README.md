# Typehole 🕳

<p><img align="left" src="./images/logo.png" width="100px"></p>

Automatically generate TypeScript types and interfaces for all serializable runtime values.

Typehole is a TypeScript development tool for Visual Studio Code that helps you automate creating the initial static typing for runtime values.

<br/>
<br/>

![file](https://user-images.githubusercontent.com/1206987/115986088-5646a280-a5b7-11eb-841c-90ab6e10198a.gif)

### How does it work?

1. Find something you need an interface for

```ts
const response = await axios.get("https://reddit.com/r/videos.json");
const data = response.data;
```

2. Add a typehole around the value with an unknown type

```ts
const data = typehole.t(response.data);
```

3. Run your code (either in a browser or with Node.js), and Typehole takes care of the rest

```ts
interface RedditResponse {
  /* ✨ Actual fields and types are automatically generated ✨ */
}

const response = await axios.get("https://reddit.com/r/videos.json");
const data: RedditResponse = typehole.t(response.data);
```

3. Remove the typehole, and you're good to go. Typeholes are meant to be development-time only, so you shouldn't commit them.

```ts
interface RedditResponse {
  /* ✨ Actual fields and types are automatically generated ✨ */
}

const response = await axios.get("https://reddit.com/r/videos.json");
const data: RedditResponse = response.data;
```

This plugin is still very experimental, so please expect and report issues.

## Features

- Generate TypeScript types from runtime values
- Augment your types by providing more runtime values<br/><br/><img width="500" src="./images/samples.gif" />

- Wrap values automatically to typeholes with a code action<br/><br/><img width="500" src="./images/code-action.png" />

### Values that can be automatically typed

All primitive values and values that are JSON serializable.

- Booleans
- Numbers
- Strings
- Arrays
- Objects
- null

So all values you can receive as an HTTP request payload can be turned into an interface.

All other values (promises, functions etc.) will be typed as `any`.

## Commands

![image](./images/commands.png)

- Starting and stopping the server manually isn't necessary by default. The server starts once you add your first typehole.

## Extension Settings

At this stage, there are no configuration options available.

## Known Issues

- Typehole server cannot be running in 2 VSCode editors at the same time as the server port is hard-coded to 17341

- Mixed top level runtime types such as `[{"a":3}, 2]` are transformed into `any[]` because of limitations in [json-ts library](https://github.com/shakyShane/json-ts/blob/master/src/transformer.ts#L202)

## Release Notes

## [1.4.0] - 2021-05-09

### Added

- Sample collection. Provide multiple different values to a typehole and the generated type gets refined based on them.

## [1.3.0] - 2021-05-08

### Added

- Configuration options for project path, package manager and if runtime should be automatically installed

## [1.1.0] - 2021-05-08

### Added

- Automatic PascalCase transformation for all generated interface and type alias names

---

**Enjoy!**
