# hello-tool

DSH 示例插件：注册一个最小的自定义工具 `hello_tool`，验证插件安装链路，并作为新插件的开发模板。

## 安装

在 DSH 的 **Plugins（插件）** 页面粘贴以下 spec 安装：

```
nanfengzzzqaq/dsh-plugins#path:/plugins/hello-tool
```

本地开发可直接用绝对路径安装本目录。

## 使用

安装启用后，对话里让 Agent 调用 `hello_tool`：

> 用 hello_tool 跟小明打个招呼

## 配置

可在 `cordis.patch.yml` 的 `config` 块覆盖默认问候语：

```yaml
- insert:
    - id: hello-tool
      name: dsh-plugin-hello-tool
      config:
        greeting: 早上好
```
