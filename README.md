# dsh-plugins

[DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 插件合集与开发模板。

这个仓库专门用于编写、托管 DSH 插件（Cordis bundle）。每个 `plugins/` 下的子目录都是一个独立可安装的插件包，可以：

- 从 GitHub 直接安装进 DSH（Web GUI 插件页粘贴一个 spec 即可）
- 以本地路径安装用于开发调试（配合 DSH 的 HMR 热更新）

## 目录结构

```
dsh-plugins/
├── plugins/
│   └── hello-tool/        # 示例插件：注册一个模型可用的自定义工具
│       ├── package.json   # 含 dsh.bundle.patch 声明
│       ├── cordis.patch.yml
│       ├── lib/index.js   # 插件入口（cordis 插件）
│       └── icon.svg
├── docs/
│   └── plugin-anatomy.md  # 插件包规范详解
├── pnpm-workspace.yaml
└── package.json
```

## 安装插件到 DSH

### 方式 A：Web GUI（推荐）

1. 打开 DSH 侧边栏的 **Plugins（插件）** 页面
2. 点击安装，粘贴下面表格里的安装 spec，例如：

```
nanfengzzzqaq/dsh-plugins#path:/plugins/hello-tool
```

3. 确认信息无误后安装并启用。安装完成后新工具即可被 Agent 使用。

> 也可以在对话中让 Agent 调用 `plugin_manager` 工具完成同样的事（需要权限）。

### 方式 B：本地开发

开发时直接用本地路径安装（绝对路径指向插件目录）：

```
D:\ai work\dsh-plugins\plugins\hello-tool
```

DSH 的插件管理器会读取该目录的 `package.json` 完成识别。配合 HMR，修改代码后无需重启即可生效（JavaScript 模块替换需要重启进程）。

## 已收录插件

| 插件 | 说明 | 安装 spec |
|---|---|---|
| [hello-tool](plugins/hello-tool/) | 示例插件：注册一个最小的自定义工具 `hello_tool`，用于验证插件链路和作为开发模板 | `nanfengzzzqaq/dsh-plugins#path:/plugins/hello-tool` |

## 如何新建一个插件

1. 复制 `plugins/hello-tool` 为 `plugins/<你的插件名>`
2. 修改 `package.json` 的 `name`、`description`，保持 `dsh.bundle.patch` 字段不变
3. 修改 `cordis.patch.yml` 里的 `id` 和 `name`（name 必须与 package.json 的 name 一致）
4. 在 `lib/index.js` 里写你的逻辑（入口规范见 [docs/plugin-anatomy.md](docs/plugin-anatomy.md)）
5. 用本地路径安装进 DSH 调试，完成后推送，即可用 GitHub spec 安装

## 插件能做什么

DSH 基于 [Cordis](https://cordis.cloud) 插件架构，插件可以（详见 [docs/plugin-anatomy.md](docs/plugin-anatomy.md)）：

- **注册模型可用的工具**：`ctx.tools.register(defineTool({...}))`，工具 schema 自动进入系统提示
- **注入宿主服务**：`inject` 声明依赖的服务（`tools`、`llm`、`sessions`、`approval` 等）
- **声明可配置项**：导出 `config` Schema，配置写在 patch / 配置层
- **挂接事件**：`tools/pre-execute`、`tools/post-execute` 等流水线事件

## 参考资料

- [pnpm 从 Git 子目录安装的语法](https://pnpm.io/package-sources#install-from-a-subdirectory-of-a-git-repository)
- DSH 内置插件包（`@deepseek-ai/dsh-*`，随应用分发，是插件 API 的最佳参考）

## License

MIT
