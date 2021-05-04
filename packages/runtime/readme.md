# Template: TypeScript Module [![CI](https://github.com/lukeed/typescript-module/workflows/CI/badge.svg)](https://github.com/lukeed/typescript-module/actions) [![codecov](https://badgen.now.sh/codecov/c/github/lukeed/typescript-module)](https://codecov.io/gh/lukeed/typescript-module)

This is a [clonable template repository](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-from-a-template) for authoring a `npm` module with TypeScript. Out of the box, it:

* Provides minimally-viable `tsconfig.json` settings
* Scaffolds a silly arithmetic module (`src/index.ts`)
* Scaffolds test suites for full test coverage (`test/index.ts`)
* Scaffolds a GitHub Action for Code Integration (CI) that:
  * checks if compilation is successful
  * runs the test suite(s)
  * reports test coverage
* Generates type definitions (`types/*.d.ts`)
* Generates multiple distribution formats:
  * ES Module (`dist/index.mjs`)
  * CommonJS (`dist/index.js`)
  * UMD (`dist/index.min.js`)

All configuration is accessible via the `rollup.config.js` and a few `package.json` keys:

* `name` &mdash; the name of your module
* `main` &mdash; the destination file for your CommonJS build
* `module` &mdash; the destination file for your ESM build (optional but recommended)
* `unpkg` &mdash; the destination file for your UMD build (optional for [unpkg.com](https://unpkg.com/))
* `umd:name` &mdash; the UMD global name for your module (optional)

## Setup

1. [Clone this template](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-from-a-template)
2. Replace all instances of `TODO` within the `license` and `package.json` files
3. Create [CodeCov](https://codecov.io) account (free for OSS)
4. Copy the provided CodeCov token as the `CODECOV_TOKEN` [repository secret](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets#creating-encrypted-secrets-for-a-repository) (for CI reporting)
5. Replace `src/index.ts` and `test/index.ts` with your own code! 🎉

## Commands

### build

Builds your module for distribution in multiple formats (ESM, CommonJS, and UMD).

```sh
$ npm run build
```

### test

Runs your test suite(s) (`/tests/**`) against your source code (`/src/**`).<br>Doing so allows for accurate code coverage.

> **Note:** Coverage is only collected and reported through the "CI" Github Action (`.github/workflows/ci.yml`).

```sh
$ npm test
```

## Publishing

> **Important:** Please finish [Setup](#setup) before continuing!

Once all `TODO` notes have been updated & your new module is ready to be shared, all that's left to do is decide its new version &mdash; AKA, do the changes consitute a `patch`, `minor`, or `major` release?

Once decided, you can run the following:

```sh
$ npm version <patch|minor|major> && git push origin master --tags && npm publish
# Example:
# npm version patch && git push origin master --tags && npm publish
```

This command sequence will:
* version your module, updating the `package.json` "version"
* create and push a `git` tag (matching the new version) to your repository
* build your module (via the `prepublishOnly` script)
* publish the module to the npm registry

## License

MIT © [Luke Edwards](https://lukeed.com)
