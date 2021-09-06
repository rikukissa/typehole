# Typeh<img src="../images/title-logo.png" align="top" width="24px">le

为所有运行时可序列化的值自动生成 Typescript 类型和接口

[English](../README.md) | [简体中文](#)

Typehole 是 Visual Studio Code 的 TypeScript 开发工具，它通过将运行时的值从 Node.js 或浏览器应用程序中桥接到代码编辑器来自动创建静态类型。当您需要 API 响应的类型或想要得到来自 JS 模块值的类型时，它是非常有用的。
<br/>
<br/>

![file](../images/demo.gif)

## 安装

安装 [Visual Studio Code - extension](https://marketplace.visualstudio.com/items?itemName=rikurouvila.typehole) 即可，不需要额外的构建工具或编译器插件。

## 它是如何工作的?

1. 从一个接口中获得 `any` / `unknown` 类型的值的类型

```typescript
const response = await axios.get("https://reddit.com/r/typescript.json");
const data /* any */ = response.data;
```

2. 通过选择表达式并按 ⌘ + 打开 **Quick Fix** 菜单，将值放置在 typeholes 中。 (macOS) 或 ctrl + . (Windows) 并选择 **Add a typehole**。

```typescript
type RedditResponse = any; // 由扩展插入的类型占位符
const response = await axios.get("https://reddit.com/r/typescript.json");

const data: RedditResponse = typehole.t(response.data);
```

3. 在浏览器或 Node.js 中运行您的代码。 Typehole 会在运行时捕获该值并将其发送回您的代码编辑器。VSCode 扩展会记录捕获的值，将来自该 typehole 的所有值转换为一个 interface 并将其插入到同一个模块中。

```typescript
interface RedditResponse {
  /* ✨ 实际的字段和类型是自动生成的 ✨ */
}

const response = await axios.get("https://reddit.com/r/typescript.json");
const data: RedditResponse = typehole.t(response.data);
```

4. 移除 typehole，就完成了所有的操作。 Typeholes 仅用于开发阶段，所以您不应该提交它们。 Typehole 为您提供了 2 个 [命令](#命令) 来轻松移除 typehole

```typescript
interface RedditResponse {
  /* ✨ 实际的字段和类型是自动生成的 ✨ */
}

const response = await axios.get("https://reddit.com/r/typescript.json");
const data: RedditResponse = response.data;
```

这个插件任然是实验性质的，如有问题请反馈 issues

## 特性

- 从运行中的值生成 Typescript 类型
- 使用不同的值多次运行代码，从而增加您的类型<br/><br/><img width="500" src="../images/samples.gif" />

- 使用代码操作将值自动包装到 typeholes<br/><br/><img width="500" src="../images/code-action.png" />

### 值能够自动的被转换为类型

所有原始值和 JSON 可序列化的值。

- Booleans
- Numbers
- Strings
- Arrays
- Objects
- null

因此，您可以其作为 HTTP 请求有效负载，接收的所有值都可以转换为 interface。

从 1.4.0 开始，支持 Promise。所有其他值（函数等）将被输入为 `any`。

## 命令

![image](../images/commands.png)

- 默认情况下不需要手动启动和停止服务器。 添加第一个 typehole 后，服务器将启动。

## 扩展设置

| 设置                            | 类型              | 默认值    | 描述                                             |
| ------------------------------- | ----------------- | --------- | ------------------------------------------------ |
| typehole.runtime.autoInstall    | boolean           | true      | 添加第一个 typehole 时自动安装 Typehole 运行时包 |
| typehole.runtime.projectPath    | string            |           | 安装 Typehole 运行时的项目目录                   |
| typehole.runtime.packageManager | npm \| yarn       | npm       | 安装运行时使用的包管理器                         |
| typehole.runtime.extensionPort  | number            | 17341     | 监听传入示例的 HTTP 扩展的 HTTP 端口             |
| typehole.typeOrInterface        | interface \| type | interface | 生成类型的关键字                                 |

## 运行时

Typehole 运行时的工作是捕获代码中的值，并将它们以序列化格式发送给扩展。

```typescript
import typehole from "typehole";

// -> POST http://extension/samples {"id": "t", "sample": "value"}
typehole.t("value");

// -> POST http://extension/samples {"id": "t1", "sample": 23423.432}
typehole.t1(23423.432);

// -> POST http://extension/samples {"id": "t2", "sample": {"some": "value"}}
typehole.t2({ some: "value" });
```

typehole 是通过您的 typehole 调用的方法名来识别的。 调用 `.t2()` 的时候会给这个 hole 一个 id "t2".因为 ids 的存在, 所以扩展知道值来自代码中的什么地方。

大部分情况下, 你应该为所有的 holes 使用唯一的 id. 然而, 如果您希望将许多 holes 中的值记录到同一类型中，您可以使用相同的 id。

有时候, 扩展可能与您的代码不在同一台主机上运行， 你想配置运行时发送值的地址。 在 Docker 容器内运行的 Node.js 应用程序就是这样一种情况。但是，在大多数情况下，您不需要配置任何内容。

```typescript
import typehole, { configure } from "typehole";

configure({
  extensionHost: "http://host.docker.internal:17341",
});
```

### 可用的运行时设置

| 设置          | 类型   | 默认值                 | 描述                       |
| ------------- | ------ | ---------------------- | -------------------------- |
| extensionHost | string | http://localhost:17341 | 扩展 HTTP 监听器的运行地址 |

## 已知问题

- Typehole 服务器不能在 2 个 VSCode 编辑器中同时运行，因为服务器端口硬编码为 17341

## 发行说明

## [1.7.0] - 2021-07-08

### Added

- 新选项”typehole.typeOrInterface"添加用于使用' type '关键字而不是' interface '。 这一切都归功于 @akafaneh 🎉

## [1.6.3] - 2021-06-20

### Fixed

- 修复代码格式生成损坏/重复的代码

## [1.6.2] - 2021-05-22

### Fixed

- 修复了将字段标记为可选的空值。 `[{"foo": null}, {"foo": 2}]` 现在生成一个 type `{foo: null | number}[]` 而不是像以前一样生成 `{foo?: number}[]`. 应该被修复 [#14](https://github.com/rikukissa/typehole/issues/14)

## [1.6.1] - 2021-05-22

### Fixed

- 修复插入了类型的文件的自动格式化

## [1.6.0] - 2021-05-20

### Added

- 用于配置扩展服务器端口和运行时主机地址的选项。 地址 [#13](https://github.com/rikukissa/typehole/issues/13)

## [1.5.1] - 2021-05-18

### Fixed

- 多个 typeholes 可以使用同一个 id。 它们的每一次更新都会更新附加到孔上的所有类型。 例如，当您希望有多个 typeholes 更新相同的类型时，这很有用。
- 当生成的顶层类型是一个 `ParenthesizedType` 的时候，不会再有重复的 interfaces。
- 当 interface 和 typehole 不在同一个文件的时候，interface 不会更新。
- 当编辑器中聚焦其他文件时，类型不会更新。
- `typehole.tNaN` [issue](https://github.com/rikukissa/typehole/issues/7) 当有非`t<number>`格式的 typeholes 的时候

## [1.5.0] - 2021-05-15

### Added

- 支持推断 Promises 👀

### Fixed

- 如果你的代码中有 typehole，那么 runtime 也会在启动时安装
- AutoDiscoveredN 类型不再重复

## [1.4.1] - 2021-05-09

### Fixed

- 非序列化的诊断现在每个 typehole 只显示一次。 以前，工具提示可能有多次相同的警告。

- 删除所有的 typeholes 后，服务器会停止。重新启动服务器现在也可以工作。

### Added

## [1.4.0] - 2021-05-09

### Added

- 样本收集。 为一个 typehole 提供多个不同的值，生成的类型将基于这些值进行优化。

## [1.3.0] - 2021-05-08

### Added

- 项目路径、包管理器和是否应该自动安装运行时的配置选项

## [1.1.0] - 2021-05-08

### Added

- 所有生成的接口和类型别名的自动 PascalCase 转换

---

**尽情畅享!**
