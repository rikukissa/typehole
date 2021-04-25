# Typehole 🕳

Bring your runtime values an inch closer to your type definitions.

Generate TypeScript interfaces for API requests and other unknown types at runtime based on actual values. So kind of like [Quicktype](https://app.quicktype.io/) or [json2ts](http://json2ts.com/), but without having to copy-paste JSON and typescript interfaces around. This plugin is still very experimental, so please expect and report issues.

![file](https://user-images.githubusercontent.com/1206987/115986088-5646a280-a5b7-11eb-841c-90ab6e10198a.gif)

## Features

- Create interfaces automatically by collecting type samples at runtime

## Commands

![image](https://user-images.githubusercontent.com/1206987/115992467-89e4f500-a5d6-11eb-9869-cf765d43ec52.png)

- Start and stop listening for type information coming from the runtime

## Requirements

At this stage, the project you're working on must have [typehole](https://www.npmjs.com/package/typehole) installed as a dependency.

## Extension Settings

At this stage, there are no configuration options available.

## Known Issues

- Typehole server cannot be running in 2 VSCode editors at the same time as the server port is hard-coded to 17341

## Release Notes

### 0.0.1

The initial release of Typehole
and Z.

---

**Enjoy!**
