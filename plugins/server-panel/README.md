# dsh-server-panel

DSH 服务器 / NAS 可视化管理面板：在一个侧边栏页面里集中管理家里的 NAS（群晖/黑群晖）和云服务器。

## 能力

| 能力 | 说明 |
| --- | --- |
| 主机管理 | 增删改查、连接测试（保存前可测）、分组、DSM 自动识别；配置存 `~/.dsh/dsh-server-panel.json`（0600） |
| 终端 | xterm.js Web 终端：SSH PTY 交互式 shell（WebSocket 双向流，自适应尺寸，断开可重连）——默认页签 |
| Web 端跳转 | 每台主机可配置多个 Web 入口（如 DSM 管理页 :5000、宝塔 :8888）：**直连**（同网可达直接开 `http://host:port`）或 **SSH 隧道**（本地转发到 127.0.0.1 再打开，穿透防火墙/安全组） |
| 概览 | 主机名、内核、运行时间、负载、内存、磁盘分区占用（一条 `/proc` 组合命令，busybox 兼容） |
| Docker | 容器列表（状态/端口/资源占用）、启动/停止/重启、日志查看 + WebSocket 实时跟随 |
| 文件 | 远程目录浏览（SFTP）、下载到本机、新建目录、重命名、删除（目录递归删除需二次确认） |
| 电源 | 重启 / 关机（确认后执行，自动处理 sudo 回退）、WOL 局域网唤醒（需配置 MAC） |

全部操作通过 SSH（ssh2 持久连接池，空闲 15 分钟自动断开）完成，服务器上**不需要安装任何 agent**。

## 安装

DSH 的 **Plugins（插件）** 页面粘贴：

```
https://github.com/nanfengzzzqaq/dsh-plugins#path:/plugins/server-panel
```

本地开发直接用绝对路径安装本目录。

## 使用

1. 安装启用后，侧边栏出现「服务器」入口（服务器图标）
2. 「添加主机」：填地址 / 端口 / 用户名 / 密码或私钥；NAS 勾上 WOL MAC 后可远程唤醒；在「Web 端入口」里配置主机的 Web 管理页（如 DSM 的 5000 端口）
3. 选中主机后四个页签：**终端**（交互式 shell）、**Docker**（容器管理）、**概览**（状态与磁盘）、**文件**（远程浏览与下载）
4. 详情头部的入口按钮直接跳转主机 Web 端：直连模式开 `http://主机:端口`；隧道模式先建 SSH 本地转发再开 `http://127.0.0.1:<本地端口>`——云服务器被安全组挡住的端口也能用

### 前置条件

- 目标机器开启 SSH（群晖：控制面板 → 终端机和 SNMP → 启动 SSH）
- Docker 管理：插件会依次尝试 `docker` → `/usr/local/bin/docker`（DSM 路径）→ `sudo -n`（免密 sudo）→ **`sudo -S` 用已存的 SSH 密码提权**（群晖管理员账号默认可用，无需任何配置）。密码仅通过 SSH 加密通道送入远端 sudo 的标准输入
- 重启/关机同样自动走 `sudo -S` 提权回退链
- WOL 需要 DSH 所在机器与 NAS 在同一局域网

## 安全模型

- 所有 `/api/dsh-server-panel/*` 路由仅限 loopback 访问——对远程服务器执行命令的接口不会暴露给局域网
- 密码 / 私钥以明文保存在 `~/.dsh/dsh-server-panel.json`，文件权限 0600
- 面板上的主机列表接口不含凭据字段（只返回 hasPassword / hasKey 标记）
- 重启 / 关机 / 递归删除均需确认；关机后只能现场开机或 WOL 唤醒

## 开发

```sh
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm run build       # esbuild → lib/index.js + lib/client.js
node test/smoke.mts  # 端到端冒烟：内存 ssh2 服务器 + 真实 HTTP 路由 + 引擎
```

冒烟测试不连真实服务器：起一个进程内 ssh2 Server，验证状态解析、Docker 列表/操作、电源命令的断连容忍、store 行为与凭据脱敏。

## License

MIT
