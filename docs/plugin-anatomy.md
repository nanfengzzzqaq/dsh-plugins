# DSH 插件包规范详解

本文档整理自 DSH 0.2.0-rc.2 随应用分发的官方插件包（如 `@deepseek-ai/dsh-experimental-auto-review`）的逆向分析，描述一个可被 DSH 插件管理器识别、安装、启用的插件 bundle 的完整规范。

## 最小可用插件包

一个插件就是一个 npm 包，最少需要三个文件：

```
my-plugin/
├── package.json      # 元数据 + dsh.bundle.patch 声明
├── cordis.patch.yml  # 向当前 profile 声明要插入的 Loader 条目
└── lib/index.js      # Cordis 插件入口
```

### package.json

关键字段是 `dsh.bundle.patch`，它告诉 DSH 这个包是一个插件 bundle：

```json
{
  "name": "dsh-plugin-hello-tool",
  "version": "0.1.0",
  "description": "一行说明，显示在插件列表里",
  "type": "module",
  "main": "lib/index.js",
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "~4.0.4",
    "@deepseek-ai/dsh-tools": "0.2.0-rc.2"
  }
}
```

注意事项：

- **`peerDependencies` 中的 DSH 包版本会做兼容检查**。安装时（`pnpm add` 前）DSH 会解析你声明的 peer 版本，与当前运行时不兼容则直接拒绝安装。所以 DSH 相关包写与目标运行一致的精确版本（如 `0.2.0-rc.2`），cordis 用 `~4.0.4`。
- `description` 会作为插件列表的一行简介显示。
- 不需要任何构建步骤。从 GitHub 安装时 pnpm 直接使用包内文件，**入口请直接提交可运行的 JS**（`lib/index.js`），不要依赖 `prepare`/`build` 脚本（脚本会被 pnpm 11 默认阻止，需用户额外批准）。

### cordis.patch.yml

声明这个 bundle 要往当前 profile 插入的 Loader 条目：

```yaml
- insert:
    - id: hello-tool            # profile 内唯一标识（小写、短横线）
      name: dsh-plugin-hello-tool   # 必须与 package.json 的 name 一致（模块说明符）
```

也可以携带配置（config 会传给插件的 `ctx.config`）：

```yaml
- insert:
    - id: hello-tool
      name: dsh-plugin-hello-tool
      config:
        greeting: 你好呀
```

### lib/index.js — Cordis 插件入口

```js
import { defineTool } from '@deepseek-ai/dsh-tools'
// schemastery 的 ESM 入口只有 default 导出（Schema 类本身），
// 必须 default import；`import { Schema }` 命名导入会直接加载失败。
import Schema from '@deepseek-ai/schemastery'

/** Cordis 插件名，用于 Loader 诊断。 */
export const name = 'hello-tool'

/** 声明依赖的宿主服务，服务就绪后才会加载本插件。 */
export const inject = ['tools']

/** 可配置项（cordis.patch.yml / 配置层可覆盖）。必须是大写 `Config` 导出。 */
export const Config = Schema.object({
  greeting: Schema.string().default('你好').description('问候语'),
})

/** 插件主体：配置经 Config 校验后作为第二个参数传入。 */
export function apply(ctx, config) {
  ctx.tools.register(
    defineTool({
      name: 'hello_tool',                     // 模型可见的工具名（snake_case）
      description: '工具描述，模型据此决定何时调用',
      parameters: {                           // 参数 schema DSL
        who: { type: 'string', description: '要问候的对象' },  // 可选参数：省略 required 即可
      },
      output: {
        schema: { type: 'string' },           // 输出的 JSON Schema
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        // args 已经过验证；exec.signal 是协作式取消信号，长任务应响应它
        return `${config.greeting}, ${args.who ?? 'DSH'}!`
      },
    }),
  )
  ctx.logger.info('hello-tool loaded')
}
```

四个导出要点：

| 导出 | 作用 |
|---|---|
| `name` | Cordis 插件名，出现在 Loader 诊断信息里 |
| `inject` | 依赖的宿主服务数组；全部就绪插件才会激活 |
| `Config` | Schema 配置声明（**大写**），可被配置层覆盖；小写 `config` 会被静默忽略 |
| `apply(ctx, config)` | 插件主体，ctx 注销时插件自动清理；第二个参数是校验后的配置 |

> **常见坑**：Cordis v4 没有 `ctx.config`。配置只能从 `apply` 的第二个参数拿
> （在工具 `execute` 里通过闭包引用）。写 `ctx.config.xxx` 会在调用时抛
> `cannot get property "config" without inject`。
> 另外标记了 `.volatile()` 的配置字段会以响应式包装传入，取值要用 `config.x.get()`。

## 常见宿主服务（inject 可用值）

来自官方插件（auto-review 等）的实际使用：

- `tools` — 工具注册表（注册自定义工具必需）
- `llm` — LLM 调用
- `sessions` — 会话访问
- `approval` — 审批流
- `permissionPresets` — 权限预设

## 工具定义 API（defineTool）

来自 `@deepseek-ai/dsh-tools`：

- `parameters` 使用内建 schema DSL：`string` / `number` / `integer` / `boolean` / `null` / `array` / `object` / `json` / `oneOf`，每项可带 `description`
- 必填与否用 `required: true` 标注；**可选参数省略 `required` 键即可，写 `required: false` 会在 `defineTool` 时直接抛 `JsonSchemaError`**（`required` 出现时必须为 true）
- 模型参数在执行前自动验证，非法输入变成普通错误结果（不会中断回合）
- `execute(args, exec)` 只能返回 `output.schema` 声明的 JSON 值
- 注册的工具 schema 会**自动进入系统提示**，无需额外操作
- 可选 `presentCall()` / `presentResult()` 供宿主 UI 消费

## 安装 spec 语法

DSH 插件管理器底层用 pnpm，支持（摘自 [pnpm 文档](https://pnpm.io/package-sources)）：

| spec | 含义 |
|---|---|
| `https://github.com/user/repo` | GitHub 仓库默认分支 |
| `https://github.com/user/repo#main` | 指定分支 |
| `https://github.com/user/repo#v1.2.0` | 指定标签 |
| `https://github.com/user/repo#path:/plugins/foo` | **monorepo 子目录**（本仓库使用的方式） |
| `D:\path\to\plugin` | 本地绝对路径（开发用） |

> **注意**：DSH 安装框只把「完整 URL」识别为 Git 地址；pnpm 支持的 `user/repo` 简写
> 会被当成 npm 包名去 registry 查询并报 `not a package name the registry accepts`，
> 所以在安装框里请始终粘贴 `https://github.com/...` 完整地址。

## 版本兼容与豁免

- DSH 升级后，若插件 peer 不满足新运行时，启动/安装会被拒绝，并提示可用 `dsh plugin ... allow-version` 或 `plugin_manager` 的 `set_version_exemption` 显式豁免（需 `acceptRisk`）
- 豁免按「包@版本 × 运行时版本」精确记录在 profile 的 `compatibility.json`

## HMR（热更新）

- profile 启用 HMR 后，`cordis.patch.yml` / 配置层改动即时生效
- **JavaScript 模块本身更换（升级、替换包）需要重启进程**加载新一代模块

## 可选的锦上添花

官方插件还携带这些可选文件，有需要时可以参考添加：

- `icon.svg` — 插件图标（插件页展示）；需要在 package.json 顶层声明 `"icon": "./icon.svg"` 才会被读取
- `locale/en.json`、`locale/zh.json` — i18n 文案
- `README.i18n.yaml` — README 多语言元数据
