# Typeh<img src="./images/title-logo.png" align="top" width="24px">le

Automatically generate TypeScript types and interfaces for all serializable runtime values.

Typehole is a TypeScript development tool for Visual Studio Code that automates creating static typing by bridging runtime values from your Node.js or browser application to your code editor. It's useful when you need types for an API response or want to figure out types for values coming from a JS module.
<br/>
<br/>

![file](./images/demo.gif)

## Installation

Install the [Visual Studio Code - extension](https://marketplace.visualstudio.com/items?itemName=rikurouvila.typehole). No additional build tooling or compiler plugins are needed.

## How does it work?

1. Find an `any` / `unknown` value you need an interface for

```typescript
const response = await axios.get("https://reddit.com/r/typescript.json");
const data /* any */ = response.data;
```

2. Place the value inside a typehole by selecting an expression and opening the **Quick Fix** menu by pressing ⌘ + . (macOS) or ctrl + . (Windows) and selecting **Add a typehole**.

```typescript
type RedditResponse = any; // Type placeholder inserted by the extension
const response = await axios.get("https://reddit.com/r/typescript.json");

const data: RedditResponse = typehole.t(response.data);
```

3. Run your code either in a browser or in Node.js. Typehole runtime captures the value and sends it back to your code editor. The VSCode extension records the captured value, turns all the values from that typehole into an interface and inserts it into the same module.

```typescript
interface RedditResponse {
  /* ✨ Actual fields and types are automatically generated ✨ */
}

const response = await axios.get("https://reddit.com/r/typescript.json");
const data: RedditResponse = typehole.t(response.data);
```

4. Remove the typehole, and you're done. Typeholes are meant to be development-time only, so you shouldn't commit them. Typehole provides you with 2 [commands](#Commands) for easy removal of typeholes.

```typescript
interface RedditResponse {
  /* ✨ Actual fields and types are automatically generated ✨ */
}

const response = await axios.get("https://reddit.com/r/typescript.json");
const data: RedditResponse = response.data;
```

This plugin is still very experimental, so please expect and report issues.

## Features

- Generate TypeScript types from runtime values
- Run the code many times with different values thus augmenting your types<br/><br/><img width="500" src="./images/samples.gif" />

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

From 1.4.0 forward also Promises are supported. All other values (functions etc.) will be typed as `any`.

## Commands

![image](./images/commands.png)

- Starting and stopping the server manually isn't necessary by default. The server starts once you add your first typehole.

## Extension Settings

| Setting                         | Type        | Default | Description                                                                     |
| ------------------------------- | ----------- | ------- | ------------------------------------------------------------------------------- |
| typehole.runtime.autoInstall    | boolean     | true    | Install Typehole runtime package automatically when the first typehole is added |
| typehole.runtime.projectPath    | string      |         | Project directory where Typehole runtime should be installed                    |
| typehole.runtime.packageManager | npm \| yarn | npm     | Package manager to be used when installing the runtime                          |
| typehole.runtime.extensionPort  | number      | 17341   | HTTP port for HTTP extension to listen for incoming samples                     |

## Runtime

Typehole runtime's job is to captures values in your code and to send them to the extension in a serialized format.

```typescript
import typehole from "typehole";

// -> POST http://extension/samples {"id": "t", "sample": "value"}
typehole.t("value");

// -> POST http://extension/samples {"id": "t1", "sample": 23423.432}
typehole.t1(23423.432);

// -> POST http://extension/samples {"id": "t2", "sample": {"some": "value"}}
typehole.t2({ some: "value" });
```

Typeholes are identified by the method name of your typehole call. Call `.t2()` would give the hole an id "t2". The ids are there, so the extension knows from where the value is coming from in the code.

In most cases, you should use unique keys for all holes. However, if you wish to record values from many holes into the same type, you might use the same id.

In some cases, the extension might not be running on the same host as your code, and you want to configure the address where the runtime sends the values. Node.js application running inside of a Docker container is one such case. In most cases, however, you do not need to configure anything.

```typescript
import typehole, { configure } from "typehole";

configure({
  extensionHost: "http://host.docker.internal:17341",
});
```

### Available runtime settings

| Setting       | Type   | Default                | Description                                                 |
| ------------- | ------ | ---------------------- | ----------------------------------------------------------- |
| extensionHost | string | http://localhost:17341 | The address in which the extension HTTP listener is running |

## Known Issues

- Typehole server cannot be running in 2 VSCode editors at the same time as the server port is hard-coded to 17341

## Release Notes

## [1.6.2] - 2021-05-22

### Fixed

- Fixes null values marking fields as optional. `[{"foo": null}, {"foo": 2}]` now generates a type `{foo: null | number}[]` and not `{foo?: number}[]` like it used to. Should fix [#14](https://github.com/rikukissa/typehole/issues/14)

## [1.6.1] - 2021-05-22

### Fixed

- Fix the automatic formatting in files where types are inserted

## [1.6.0] - 2021-05-20

### Added

- Options for configuring both the extension server port and runtime host address. Addresses [#13](https://github.com/rikukissa/typehole/issues/13)

## [1.5.1] - 2021-05-18

### Fixed

- Multiple typeholes can now exist with the same id. Each update from all of them updates all types attached to the holes. Useful, for example, when you want to have multiple typeholes update the same type.
- No duplicated interfaces anymore when the generated top-level type is a `ParenthesizedType`
- Interface not updating when it was in a different file than the typehole
- Types not updating when some other file was focused in the editor
- `typehole.tNaN` [issue](https://github.com/rikukissa/typehole/issues/7) when there have been typeholes with a non `t<number>` format

## [1.5.0] - 2021-05-15

### Added

- Support for inferring Promises 👀

### Fixed

- Runtime now installed also on startup if there are typeholes in your code
- No more duplicate AutoDiscoveredN types

## [1.4.1] - 2021-05-09

### Fixed

- Unserializable diagnostic now shown only once per typehole. Previously the tooltip could have the same warning multiple times.

- Server is now stopped once all typeholes are removed. Restarting the server now also works

### Added

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
