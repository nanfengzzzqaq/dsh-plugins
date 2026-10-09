window.__ModuleLoader__.load({
	id: "dsh-server-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/protocol.ts
var API = {
  hosts: "/api/dsh-server-panel/hosts",
  test: "/api/dsh-server-panel/test",
  status: "/api/dsh-server-panel/status",
  dockerContainers: "/api/dsh-server-panel/docker/containers",
  dockerAction: "/api/dsh-server-panel/docker/action",
  dockerLogs: "/api/dsh-server-panel/docker/logs",
  power: "/api/dsh-server-panel/power",
  wol: "/api/dsh-server-panel/wol",
  filesList: "/api/dsh-server-panel/files/list",
  filesDownload: "/api/dsh-server-panel/files/download",
  filesMkdir: "/api/dsh-server-panel/files/mkdir",
  filesRename: "/api/dsh-server-panel/files/rename",
  filesDelete: "/api/dsh-server-panel/files/delete",
  /** WebSocket upgrade path for streaming docker logs. */
  dockerLogsFollow: "/api/dsh-server-panel/docker/logs-follow"
};

// src/client/locales.ts
var zh = {
  "entry.label": "\u670D\u52A1\u5668",
  "panel.title": "\u670D\u52A1\u5668\u9762\u677F",
  "hosts.add": "\u6DFB\u52A0\u4E3B\u673A",
  "hosts.empty": "\u8FD8\u6CA1\u6709\u4E3B\u673A\u3002\u70B9\u51FB\u300C\u6DFB\u52A0\u4E3B\u673A\u300D\u63A5\u5165\u4F60\u7684 NAS \u6216\u4E91\u670D\u52A1\u5668\u3002",
  "hosts.edit": "\u7F16\u8F91",
  "hosts.delete": "\u5220\u9664",
  "hosts.delete.confirm": "\u786E\u5B9A\u5220\u9664\u4E3B\u673A\u300C{label}\u300D\u5417\uFF1F\u914D\u7F6E\u548C\u51ED\u636E\u4F1A\u4E00\u8D77\u79FB\u9664\u3002",
  "hosts.test": "\u6D4B\u8BD5\u8FDE\u63A5",
  "hosts.group.all": "\u5168\u90E8",
  "host.form.title.add": "\u6DFB\u52A0\u4E3B\u673A",
  "host.form.title.edit": "\u7F16\u8F91\u4E3B\u673A",
  "host.form.alias": "\u522B\u540D\uFF08\u552F\u4E00\u6807\u8BC6\uFF09",
  "host.form.label": "\u540D\u79F0",
  "host.form.host": "\u5730\u5740",
  "host.form.port": "\u7AEF\u53E3",
  "host.form.username": "\u7528\u6237\u540D",
  "host.form.authType": "\u8BA4\u8BC1\u65B9\u5F0F",
  "host.form.authType.password": "\u5BC6\u7801",
  "host.form.authType.key": "\u79C1\u94A5",
  "host.form.password": "\u5BC6\u7801",
  "host.form.password.keep": "\u7559\u7A7A\u4FDD\u6301\u4E0D\u53D8",
  "host.form.privateKey": "\u79C1\u94A5\uFF08PEM\uFF09",
  "host.form.privateKey.keep": "\u7559\u7A7A\u4FDD\u6301\u4E0D\u53D8",
  "host.form.passphrase": "\u79C1\u94A5\u53E3\u4EE4\uFF08\u53EF\u9009\uFF09",
  "host.form.group": "\u5206\u7EC4\uFF08\u5982 NAS / \u4E91\u670D\u52A1\u5668\uFF09",
  "host.form.wolMac": "WOL MAC \u5730\u5740\uFF08\u53EF\u9009\uFF09",
  "host.form.wolBroadcast": "WOL \u5E7F\u64AD\u5730\u5740\uFF08\u9ED8\u8BA4 255.255.255.255\uFF09",
  "host.form.notes": "\u5907\u6CE8\uFF08\u53EF\u9009\uFF09",
  "host.form.save": "\u4FDD\u5B58",
  "host.form.cancel": "\u53D6\u6D88",
  "host.form.testing": "\u6D4B\u8BD5\u4E2D\u2026",
  "host.form.test.ok": "\u8FDE\u63A5\u6210\u529F\uFF08{latency}ms\uFF09{banner}",
  "host.form.test.fail": "\u8FDE\u63A5\u5931\u8D25\uFF1A{error}",
  "common.refresh": "\u5237\u65B0",
  "common.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "common.error": "\u9519\u8BEF\uFF1A{error}",
  "common.close": "\u5173\u95ED",
  "common.cancel": "\u53D6\u6D88",
  "common.confirm": "\u786E\u8BA4",
  "common.delete": "\u5220\u9664",
  "common.rename": "\u91CD\u547D\u540D",
  "common.download": "\u4E0B\u8F7D",
  "common.never": "\u4ECE\u672A",
  "tab.overview": "\u6982\u89C8",
  "tab.docker": "Docker",
  "tab.files": "\u6587\u4EF6",
  "overview.hostname": "\u4E3B\u673A\u540D",
  "overview.kernel": "\u5185\u6838",
  "overview.kind": "\u7C7B\u578B",
  "overview.kind.dsm": "\u7FA4\u6656 DSM",
  "overview.kind.linux": "Linux",
  "overview.uptime": "\u8FD0\u884C\u65F6\u95F4",
  "overview.load": "\u8D1F\u8F7D\uFF081/5/15 \u5206\u949F\uFF09",
  "overview.cpu": "CPU \u6838\u5FC3\u6570",
  "overview.mem": "\u5185\u5B58",
  "overview.mem.format": "\u5DF2\u7528 {used} / {total}\uFF08{percent}%\uFF09",
  "overview.disks": "\u78C1\u76D8",
  "overview.disks.empty": "\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u78C1\u76D8\u5206\u533A",
  "power.reboot": "\u91CD\u542F",
  "power.shutdown": "\u5173\u673A",
  "power.wol": "WOL \u5524\u9192",
  "power.reboot.confirm": "\u786E\u5B9A\u91CD\u542F\u300C{label}\u300D\u5417\uFF1F\u8FDE\u63A5\u4F1A\u7ACB\u5373\u65AD\u5F00\u3002",
  "power.shutdown.confirm": "\u786E\u5B9A\u5173\u95ED\u300C{label}\u300D\u5417\uFF1F\u4E4B\u540E\u53EA\u80FD\u73B0\u573A\u5F00\u673A\u6216\u7528 WOL \u5524\u9192\u3002",
  "power.sent": "\u547D\u4EE4\u5DF2\u4E0B\u53D1\uFF08\u8FDE\u63A5\u968F\u4E4B\u4E2D\u65AD\u5C5E\u6B63\u5E38\uFF09",
  "power.wol.sent": "\u9B54\u672F\u5305\u5DF2\u53D1\u9001",
  "power.failed": "\u64CD\u4F5C\u5931\u8D25\uFF1A{error}",
  "docker.refresh": "\u5237\u65B0",
  "docker.empty": "\u6CA1\u6709\u5BB9\u5668\uFF08\u6216 docker \u4E0D\u53EF\u7528\uFF09",
  "docker.name": "\u540D\u79F0",
  "docker.image": "\u955C\u50CF",
  "docker.state": "\u72B6\u6001",
  "docker.ports": "\u7AEF\u53E3",
  "docker.cpu": "CPU",
  "docker.mem": "\u5185\u5B58",
  "docker.actions": "\u64CD\u4F5C",
  "docker.start": "\u542F\u52A8",
  "docker.stop": "\u505C\u6B62",
  "docker.restart": "\u91CD\u542F",
  "docker.logs": "\u65E5\u5FD7",
  "docker.logs.title": "\u5BB9\u5668\u65E5\u5FD7\uFF1A{name}",
  "docker.logs.follow": "\u8DDF\u968F",
  "docker.logs.stop": "\u505C\u6B62\u8DDF\u968F",
  "docker.logs.loading": "\u65E5\u5FD7\u52A0\u8F7D\u4E2D\u2026",
  "docker.action.failed": "\u64CD\u4F5C\u5931\u8D25\uFF1A{error}",
  "docker.confirm.stop": "\u786E\u5B9A\u505C\u6B62\u5BB9\u5668 {name} \u5417\uFF1F",
  "docker.confirm.restart": "\u786E\u5B9A\u91CD\u542F\u5BB9\u5668 {name} \u5417\uFF1F",
  "files.path": "\u8DEF\u5F84",
  "files.up": "\u4E0A\u4E00\u7EA7",
  "files.home": "\u6839\u76EE\u5F55",
  "files.newdir": "\u65B0\u5EFA\u76EE\u5F55",
  "files.newdir.prompt": "\u65B0\u76EE\u5F55\u540D\u79F0\uFF1A",
  "files.rename.prompt": "\u65B0\u540D\u79F0\uFF1A",
  "files.delete.confirm": "\u786E\u5B9A\u5220\u9664 {name} \u5417\uFF1F",
  "files.delete.confirm.dir": "\u786E\u5B9A\u5220\u9664\u76EE\u5F55 {name} \u5417\uFF1F\uFF08\u4EC5\u7A7A\u76EE\u5F55\uFF1B\u52FE\u9009\u9012\u5F52\u53EF\u5220\u975E\u7A7A\u76EE\u5F55\uFF09",
  "files.delete.recursive": "\u9012\u5F52\u5220\u9664",
  "files.name": "\u540D\u79F0",
  "files.size": "\u5927\u5C0F",
  "files.mtime": "\u4FEE\u6539\u65F6\u95F4",
  "files.actions": "\u64CD\u4F5C",
  "files.empty": "\u7A7A\u76EE\u5F55",
  "files.loading": "\u8BFB\u53D6\u4E2D\u2026",
  "files.failed": "\u8BFB\u53D6\u5931\u8D25\uFF1A{error}",
  "status.offline": "\u79BB\u7EBF",
  "status.testing": "\u68C0\u6D4B\u4E2D\u2026",
  "status.unknown": "\u672A\u68C0\u6D4B"
};
var en = {
  "entry.label": "Servers",
  "panel.title": "Server Panel",
  "hosts.add": "Add host",
  "hosts.empty": 'No hosts yet. Click "Add host" to connect your NAS or cloud server.',
  "hosts.edit": "Edit",
  "hosts.delete": "Delete",
  "hosts.delete.confirm": 'Delete host "{label}"? The configuration and credentials will be removed.',
  "hosts.test": "Test connection",
  "hosts.group.all": "All",
  "host.form.title.add": "Add host",
  "host.form.title.edit": "Edit host",
  "host.form.alias": "Alias (unique id)",
  "host.form.label": "Label",
  "host.form.host": "Host",
  "host.form.port": "Port",
  "host.form.username": "Username",
  "host.form.authType": "Auth",
  "host.form.authType.password": "Password",
  "host.form.authType.key": "Private key",
  "host.form.password": "Password",
  "host.form.password.keep": "leave empty to keep unchanged",
  "host.form.privateKey": "Private key (PEM)",
  "host.form.privateKey.keep": "leave empty to keep unchanged",
  "host.form.passphrase": "Key passphrase (optional)",
  "host.form.group": "Group (e.g. NAS / Cloud)",
  "host.form.wolMac": "WOL MAC address (optional)",
  "host.form.wolBroadcast": "WOL broadcast address (default 255.255.255.255)",
  "host.form.notes": "Notes (optional)",
  "host.form.save": "Save",
  "host.form.cancel": "Cancel",
  "host.form.testing": "Testing\u2026",
  "host.form.test.ok": "Connected ({latency}ms) {banner}",
  "host.form.test.fail": "Connection failed: {error}",
  "common.refresh": "Refresh",
  "common.loading": "Loading\u2026",
  "common.error": "Error: {error}",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.delete": "Delete",
  "common.rename": "Rename",
  "common.download": "Download",
  "common.never": "never",
  "tab.overview": "Overview",
  "tab.docker": "Docker",
  "tab.files": "Files",
  "overview.hostname": "Hostname",
  "overview.kernel": "Kernel",
  "overview.kind": "Kind",
  "overview.kind.dsm": "Synology DSM",
  "overview.kind.linux": "Linux",
  "overview.uptime": "Uptime",
  "overview.load": "Load (1/5/15 min)",
  "overview.cpu": "CPU cores",
  "overview.mem": "Memory",
  "overview.mem.format": "{used} / {total} used ({percent}%)",
  "overview.disks": "Disks",
  "overview.disks.empty": "No disk partitions to show",
  "power.reboot": "Reboot",
  "power.shutdown": "Shut down",
  "power.wol": "Wake (WOL)",
  "power.reboot.confirm": 'Reboot "{label}"? The connection drops immediately.',
  "power.shutdown.confirm": 'Shut down "{label}"? It can only be powered on locally or via WOL afterwards.',
  "power.sent": "Command sent (the connection dropping is expected)",
  "power.wol.sent": "Magic packet sent",
  "power.failed": "Operation failed: {error}",
  "docker.refresh": "Refresh",
  "docker.empty": "No containers (or docker unavailable)",
  "docker.name": "Name",
  "docker.image": "Image",
  "docker.state": "State",
  "docker.ports": "Ports",
  "docker.cpu": "CPU",
  "docker.mem": "Memory",
  "docker.actions": "Actions",
  "docker.start": "Start",
  "docker.stop": "Stop",
  "docker.restart": "Restart",
  "docker.logs": "Logs",
  "docker.logs.title": "Container logs: {name}",
  "docker.logs.follow": "Follow",
  "docker.logs.stop": "Stop following",
  "docker.logs.loading": "Loading logs\u2026",
  "docker.action.failed": "Action failed: {error}",
  "docker.confirm.stop": "Stop container {name}?",
  "docker.confirm.restart": "Restart container {name}?",
  "files.path": "Path",
  "files.up": "Up",
  "files.home": "Root",
  "files.newdir": "New folder",
  "files.newdir.prompt": "New folder name:",
  "files.rename.prompt": "New name:",
  "files.delete.confirm": "Delete {name}?",
  "files.delete.confirm.dir": "Delete directory {name}? (empty only; check recursive for non-empty)",
  "files.delete.recursive": "Recursive delete",
  "files.name": "Name",
  "files.size": "Size",
  "files.mtime": "Modified",
  "files.actions": "Actions",
  "files.empty": "Empty directory",
  "files.loading": "Reading\u2026",
  "files.failed": "Read failed: {error}",
  "status.offline": "offline",
  "status.testing": "probing\u2026",
  "status.unknown": "not probed"
};

// src/client/i18n.ts
var runtimeTranslate;
function setRuntimeTranslate(fn) {
  runtimeTranslate = fn;
}
function tt(key, vars) {
  let text;
  try {
    text = runtimeTranslate?.(key) ?? zh[key];
  } catch {
    text = zh[key];
  }
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

// src/client/api.ts
var ServerPanelApiError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ServerPanelApiError";
  }
};
async function readJson(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ServerPanelApiError(`HTTP ${response.status}: invalid JSON response`);
  }
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && typeof body.error === "string" ? body.error : `HTTP ${response.status}`;
    throw new ServerPanelApiError(message);
  }
  return body;
}
function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text === "" ? "" : "?" + text;
}
async function post(path, body) {
  return readJson(await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }));
}
var ServerPanelApi = class {
  async listHosts() {
    const data = await readJson(await fetch(API.hosts));
    return data.hosts;
  }
  async createHost(payload) {
    const data = await post(API.hosts, payload);
    return data.host;
  }
  async updateHost(alias, patch) {
    const data = await readJson(await fetch(API.hosts + query({ alias }), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    }));
    return data.host;
  }
  async deleteHost(alias) {
    await readJson(await fetch(API.hosts + query({ alias }), { method: "DELETE" }));
  }
  /** Test a saved host. */
  async testSaved(alias) {
    return post(API.test, { alias });
  }
  /** Test an unsaved form payload (throwaway connection on the host). */
  async testHost(payload) {
    return post(API.test, { payload });
  }
  async status(alias) {
    const data = await readJson(await fetch(API.status + query({ alias })));
    return data.status;
  }
  async dockerContainers(alias) {
    const data = await readJson(await fetch(API.dockerContainers + query({ alias })));
    return data.containers;
  }
  async dockerAction(alias, id, action) {
    await post(API.dockerAction, { alias, id, action });
  }
  async dockerLogs(alias, id, tail = 200) {
    const data = await readJson(await fetch(API.dockerLogs + query({ alias, id, tail })));
    return data.logs;
  }
  /** WebSocket URL for the streaming logs endpoint. */
  dockerLogsFollowUrl(alias, id, tail = 200) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${API.dockerLogsFollow}${query({ alias, id, tail })}`;
  }
  async power(alias, action) {
    await post(API.power, { alias, action });
  }
  async wol(alias) {
    await post(API.wol, { alias });
  }
  async fileList(alias, path) {
    const data = await readJson(await fetch(API.filesList + query({ alias, path })));
    return data.entries;
  }
  /** Browser-save a remote file. */
  async fileDownload(alias, path) {
    const response = await fetch(API.filesDownload + query({ alias, path }));
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ServerPanelApiError(text || `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const name = path.replace(/\/+$/, "").split("/").pop() ?? "download";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
  }
  async fileMkdir(alias, path) {
    await post(API.filesMkdir, { alias, path });
  }
  async fileRename(alias, from, to) {
    await post(API.filesRename, { alias, from, to });
  }
  async fileDelete(alias, path, isDir, recursive) {
    await post(API.filesDelete, { alias, path, isDir, recursive });
  }
};
function formatBytes(kb) {
  if (!Number.isFinite(kb) || kb < 0) return "-";
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  if (gb < 1024) return `${gb.toFixed(1)} GB`;
  return `${(gb / 1024).toFixed(2)} TB`;
}
function formatFileSize(bytes) {
  return formatBytes(bytes / 1024);
}
function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// src/client/styles.ts
var PANEL_CSS = `
.dshsp-view { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family); }
.dshsp-header { flex: none; display: flex; align-items: center; gap: 10px; padding: 14px 16px 10px; }
.dshsp-title { flex: 1; margin: 0; font-size: 16px; font-weight: 700; white-space: nowrap; }
.dshsp-body { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.dshsp-hosts { flex: none; width: 240px; border-right: 1px solid var(--dsw-alias-border-l1);
  display: flex; flex-direction: column; overflow-y: auto; padding: 10px; gap: 8px; }
.dshsp-hostcard { text-align: left; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); cursor: pointer;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; font: inherit; width: 100%; }
.dshsp-hostcard:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-hostcard[data-active] { border-color: var(--dsw-alias-state-business-primary); }
.dshsp-hostcard-top { display: flex; align-items: center; gap: 8px; }
.dshsp-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-tertiary); }
.dshsp-dot[data-status=ok] { background: var(--dsw-alias-state-success-primary); }
.dshsp-dot[data-status=fail] { background: var(--dsw-alias-state-error-primary); }
.dshsp-dot[data-status=testing] { background: var(--dsw-alias-state-warn-primary); }
.dshsp-hostname { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.dshsp-hostaddr { color: var(--dsw-alias-label-tertiary); font-size: 11.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshsp-hostmeta { display: flex; gap: 6px; align-items: center; }
.dshsp-detail { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
.dshsp-detail-head { flex: none; display: flex; align-items: center; gap: 10px; padding: 12px 16px 0; flex-wrap: wrap; }
.dshsp-detail-title { font-size: 14px; font-weight: 700; }
.dshsp-detail-sub { color: var(--dsw-alias-label-tertiary); font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshsp-spacer { flex: 1; }
.dshsp-tabs { flex: none; display: flex; gap: 2px; padding: 8px 16px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshsp-tab { border: none; border-bottom: 2px solid transparent; border-radius: 6px 6px 0 0; background: none;
  color: var(--dsw-alias-label-secondary); cursor: pointer; padding: 7px 14px; font-size: 13px; font-family: inherit; }
.dshsp-tab:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-tab[data-active] { color: var(--dsw-alias-label-primary); font-weight: 600;
  border-bottom-color: var(--dsw-alias-state-business-primary); }
.dshsp-tabbody { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px 16px;
  display: flex; flex-direction: column; gap: 10px; }
.dshsp-toolbar { flex: none; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dshsp-btn { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: none; cursor: pointer;
  color: var(--dsw-alias-label-primary); padding: 5px 12px; font-size: 12px; font-family: inherit; white-space: nowrap; }
.dshsp-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-btn:disabled { opacity: .45; cursor: default; }
.dshsp-btn[data-primary] { background: var(--dsw-alias-button-info-fill); color: var(--dsw-alias-label-primary-foreground);
  border: none; font-weight: 600; padding: 6px 14px; font-size: 13px; }
.dshsp-btn[data-primary]:hover:not(:disabled) { background: var(--dsw-alias-button-info-hover); }
.dshsp-btn[data-danger] { color: var(--dsw-alias-state-error-primary); }
.dshsp-iconbtn { width: 26px; height: 26px; border: none; border-radius: 6px; background: none; cursor: pointer;
  color: var(--dsw-alias-label-secondary); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
.dshsp-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshsp-tablewrap { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; overflow: auto; flex: 1; min-height: 0; }
.dshsp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dshsp-table th { position: sticky; top: 0; z-index: 1; text-align: left; padding: 8px 10px; font-weight: 600;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary);
  border-bottom: 1px solid var(--dsw-alias-border-l1); white-space: nowrap; }
.dshsp-table td { padding: 7px 10px; border-bottom: 1px solid var(--dsw-alias-separator-primary); vertical-align: middle; }
.dshsp-table tbody tr:last-child td { border-bottom: none; }
.dshsp-table tbody tr:hover td { background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshsp-muted { color: var(--dsw-alias-label-tertiary); }
.dshsp-badge { display: inline-block; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px;
  padding: 1px 8px; font-size: 11px; line-height: 1.6; white-space: nowrap; color: var(--dsw-alias-label-secondary); }
.dshsp-badge[data-kind=dsm] { color: var(--dsw-alias-state-business-primary); border-color: var(--dsw-alias-state-business-primary); }
.dshsp-badge[data-state=running] { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.dshsp-badge[data-state=exited] { color: var(--dsw-alias-label-tertiary); }
.dshsp-empty, .dshsp-loading { text-align: center; color: var(--dsw-alias-label-tertiary); padding: 28px 12px; font-size: 12.5px; }
.dshsp-banner { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 8px 12px;
  font-size: 12.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dshsp-banner[data-kind=ok] { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.dshsp-banner[data-kind=error] { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dshsp-kv { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; font-size: 12.5px; }
.dshsp-kv dt { color: var(--dsw-alias-label-secondary); } .dshsp-kv dd { margin: 0; }
.dshsp-meter { height: 6px; border-radius: 999px; background: var(--dsw-alias-interactive-bg-hover); overflow: hidden; min-width: 90px; }
.dshsp-meter-fill { height: 100%; border-radius: 999px; background: var(--dsw-alias-state-business-primary); }
.dshsp-meter-fill[data-hot] { background: var(--dsw-alias-state-error-primary); }
.dshsp-modal-backdrop { position: fixed; inset: 0; z-index: 40; background: var(--dsw-alias-bg-mask-1);
  display: flex; align-items: center; justify-content: center; }
.dshsp-modal { background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px;
  box-shadow: var(--dsw-shadow-lv3); color: var(--dsw-alias-label-primary); width: min(620px, calc(100vw - 48px));
  max-height: calc(100vh - 96px); overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.dshsp-modal-lg { width: min(860px, calc(100vw - 48px)); }
.dshsp-modal-title { margin: 0; font-size: 15px; font-weight: 700; }
.dshsp-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.dshsp-field { display: flex; flex-direction: column; gap: 5px; }
.dshsp-field-label { color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; }
.dshsp-input { color: var(--dsw-alias-label-primary); background: var(--dsw-specific-input-major);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; outline: none; padding: 7px 10px;
  font-family: inherit; font-size: 13px; resize: vertical; }
.dshsp-input:focus { border-color: var(--dsw-alias-state-business-primary); }
.dshsp-formrow { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px 12px; }
.dshsp-radio-row { display: flex; align-items: center; gap: 16px; }
.dshsp-radio-label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; }
.dshsp-logbox { background: #0b0e14; color: #d3e1f5; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.55;
  padding: 10px 12px; white-space: pre-wrap; word-break: break-all; overflow-y: auto; flex: 1; min-height: 220px; max-height: 55vh; }
.dshsp-pathbar { display: flex; align-items: center; gap: 8px; }
.dshsp-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px;
  color: var(--dsw-alias-label-secondary); }
.dshsp-filename { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsp-filename[data-dir] { color: var(--dsw-alias-state-business-primary); cursor: pointer; font-weight: 500; }
.dshsp-row-actions { display: flex; gap: 6px; white-space: nowrap; }
.dshsp-hint { color: var(--dsw-alias-label-tertiary); font-size: 11.5px; }
`;
function installStyles() {
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-server-panel";
  tag.textContent = PANEL_CSS;
  document.head.appendChild(tag);
  return () => tag.remove();
}

// src/client/panel/App.tsx
var import_react5 = require("react");

// src/client/panel/HostForm.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function HostForm({ mode, host, api, onCancel, onSave }) {
  const [alias, setAlias] = (0, import_react.useState)(host?.alias ?? "");
  const [label, setLabel] = (0, import_react.useState)(host?.label ?? "");
  const [hostname, setHostname] = (0, import_react.useState)(host?.host ?? "");
  const [port, setPort] = (0, import_react.useState)(String(host?.port ?? 22));
  const [username, setUsername] = (0, import_react.useState)(host?.username ?? "");
  const [authType, setAuthType] = (0, import_react.useState)(host?.authType ?? "password");
  const [password, setPassword] = (0, import_react.useState)("");
  const [privateKey, setPrivateKey] = (0, import_react.useState)("");
  const [passphrase, setPassphrase] = (0, import_react.useState)("");
  const [group, setGroup] = (0, import_react.useState)(host?.group ?? "");
  const [wolMac, setWolMac] = (0, import_react.useState)(host?.wolMac ?? "");
  const [wolBroadcast, setWolBroadcast] = (0, import_react.useState)(host?.wolBroadcast ?? "");
  const [notes, setNotes] = (0, import_react.useState)(host?.notes ?? "");
  const [error, setError] = (0, import_react.useState)();
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [testState, setTestState] = (0, import_react.useState)("idle");
  const buildPayload = () => ({
    alias: alias.trim(),
    label: label.trim(),
    host: hostname.trim(),
    port: Number(port) || 22,
    username: username.trim(),
    authType,
    password: password === "" ? void 0 : password,
    privateKey: privateKey.trim() === "" ? void 0 : privateKey,
    passphrase: passphrase === "" ? void 0 : passphrase,
    group: group.trim() || void 0,
    wolMac: wolMac.trim() || void 0,
    wolBroadcast: wolBroadcast.trim() || void 0,
    notes: notes.trim() || void 0
  });
  const onTest = async () => {
    setTestState("testing");
    setError(void 0);
    const payload = buildPayload();
    const credentialKept = mode === "edit" && authType === "password" && password === "" && alias.trim() === host?.alias;
    const keyKept = mode === "edit" && authType === "key" && privateKey.trim() === "" && alias.trim() === host?.alias;
    try {
      const result = (credentialKept || keyKept) && host ? await api.testSaved(host.alias) : await api.testHost(payload);
      setTestState({ result });
    } catch (testError) {
      setTestState({ result: { ok: false, error: testError instanceof Error ? testError.message : String(testError) } });
    }
  };
  const onSubmit = async () => {
    setSaving(true);
    setError(void 0);
    try {
      await onSave(buildPayload(), mode === "edit" ? host?.alias : void 0);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshsp-modal-backdrop", onClick: onCancel, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshsp-modal", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "dshsp-modal-title", children: tt(mode === "add" ? "host.form.title.add" : "host.form.title.edit") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshsp-formrow", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.alias") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: alias, onChange: (e) => setAlias(e.target.value), placeholder: "nas" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.label") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: label, onChange: (e) => setLabel(e.target.value), placeholder: "\u5BB6\u91CC\u7684 NAS" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshsp-formrow", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.host") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: hostname, onChange: (e) => setHostname(e.target.value), placeholder: "192.168.1.10" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.port") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: port, onChange: (e) => setPort(e.target.value), inputMode: "numeric" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.username") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "admin" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshsp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.authType") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshsp-radio-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-radio-label", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "radio", checked: authType === "password", onChange: () => setAuthType("password") }),
          tt("host.form.authType.password")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-radio-label", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "radio", checked: authType === "key", onChange: () => setAuthType("key") }),
          tt("host.form.authType.key")
        ] })
      ] })
    ] }),
    authType === "password" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dshsp-field-label", children: [
        tt("host.form.password"),
        mode === "edit" && host?.hasPassword ? `\uFF08${tt("host.form.password.keep")}\uFF09` : ""
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", type: "password", value: password, onChange: (e) => setPassword(e.target.value) })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dshsp-field-label", children: [
          tt("host.form.privateKey"),
          mode === "edit" && host?.hasKey ? `\uFF08${tt("host.form.privateKey.keep")}\uFF09` : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "dshsp-input", rows: 5, value: privateKey, onChange: (e) => setPrivateKey(e.target.value), placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.passphrase") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", type: "password", value: passphrase, onChange: (e) => setPassphrase(e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshsp-formrow", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.group") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: group, onChange: (e) => setGroup(e.target.value), placeholder: "NAS" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.wolMac") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: wolMac, onChange: (e) => setWolMac(e.target.value), placeholder: "01:23:45:67:89:ab" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.wolBroadcast") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: wolBroadcast, onChange: (e) => setWolBroadcast(e.target.value), placeholder: "255.255.255.255" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dshsp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshsp-field-label", children: tt("host.form.notes") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dshsp-input", value: notes, onChange: (e) => setNotes(e.target.value) })
    ] }),
    testState !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshsp-banner", "data-kind": testState === "testing" ? "info" : testState.result.ok ? "ok" : "error", children: testState === "testing" ? tt("host.form.testing") : testState.result.ok ? tt("host.form.test.ok", { latency: testState.result.latencyMs ?? 0, banner: testState.result.banner ?? "" }) : tt("host.form.test.fail", { error: testState.result.error ?? "" }) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshsp-banner", "data-kind": "error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshsp-modal-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dshsp-btn", onClick: () => void onTest(), disabled: saving || testState === "testing", children: tt("hosts.test") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dshsp-btn", onClick: onCancel, disabled: saving, children: tt("host.form.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dshsp-btn", "data-primary": "", onClick: () => void onSubmit(), disabled: saving, children: tt("host.form.save") })
    ] })
  ] }) });
}

// src/client/panel/OverviewTab.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function OverviewTab({ api, alias }) {
  const [status, setStatus] = (0, import_react2.useState)();
  const [error, setError] = (0, import_react2.useState)();
  const [loading, setLoading] = (0, import_react2.useState)(true);
  const refresh = (0, import_react2.useCallback)(async () => {
    try {
      setStatus(await api.status(alias));
      setError(void 0);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : String(statusError));
    } finally {
      setLoading(false);
    }
  }, [api, alias]);
  (0, import_react2.useEffect)(() => {
    setLoading(true);
    setStatus(void 0);
    setError(void 0);
    void refresh();
    const timer = setInterval(() => void refresh(), 15e3);
    return () => clearInterval(timer);
  }, [refresh]);
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-loading", children: tt("common.loading") });
  if (error) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "dshsp-btn", onClick: () => void refresh(), children: tt("common.refresh") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-banner", "data-kind": "error", children: tt("common.error", { error }) })
    ] });
  }
  if (!status) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-empty" });
  const memUsed = status.memTotalKb - status.memAvailableKb;
  const memPercent = status.memTotalKb > 0 ? Math.round(memUsed / status.memTotalKb * 100) : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "dshsp-btn", onClick: () => void refresh(), children: tt("common.refresh") }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { className: "dshsp-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: tt("overview.hostname") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { className: "dshsp-mono", children: status.hostname || "-" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: tt("overview.kind") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshsp-badge", "data-kind": status.kind, children: tt(status.kind === "dsm" ? "overview.kind.dsm" : "overview.kind.linux") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: tt("overview.kernel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { className: "dshsp-mono", children: status.kernel || "-" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: tt("overview.uptime") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: formatUptime(status.uptimeSeconds) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: tt("overview.cpu") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: status.cpuCount || "-" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: tt("overview.load") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { className: "dshsp-mono", children: status.loadAvg.map((v) => v.toFixed(2)).join("  ") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: tt("overview.mem") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-meter", style: { flex: "0 140px" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-meter-fill", "data-hot": memPercent >= 90 ? "" : void 0, style: { width: `${memPercent}%` } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: tt("overview.mem.format", { used: formatBytes(memUsed), total: formatBytes(status.memTotalKb), percent: memPercent }) })
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-field-label", children: tt("overview.disks") }),
    status.disks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-empty", children: tt("overview.disks.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-tablewrap", style: { flex: "none" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "dshsp-table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: tt("files.path") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: tt("files.size") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "%" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", {})
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: status.disks.map((disk) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "dshsp-mono", children: disk.mount }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { children: [
          formatBytes(disk.usedKb),
          " / ",
          formatBytes(disk.totalKb)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { className: "dshsp-mono", children: [
          disk.usePercent,
          "%"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: { width: 140 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-meter", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshsp-meter-fill", "data-hot": disk.usePercent >= 90 ? "" : void 0, style: { width: `${Math.min(disk.usePercent, 100)}%` } }) }) })
      ] }, disk.mount)) })
    ] }) })
  ] });
}

// src/client/panel/DockerTab.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function DockerTab({ api, alias }) {
  const [containers, setContainers] = (0, import_react3.useState)();
  const [error, setError] = (0, import_react3.useState)();
  const [busyId, setBusyId] = (0, import_react3.useState)();
  const [logsFor, setLogsFor] = (0, import_react3.useState)();
  const refresh = (0, import_react3.useCallback)(async () => {
    try {
      setContainers(await api.dockerContainers(alias));
      setError(void 0);
    } catch (dockerError) {
      setError(dockerError instanceof Error ? dockerError.message : String(dockerError));
    }
  }, [api, alias]);
  (0, import_react3.useEffect)(() => {
    setContainers(void 0);
    setError(void 0);
    void refresh();
  }, [refresh]);
  const action = async (container, name) => {
    if (name === "stop" && !window.confirm(tt("docker.confirm.stop", { name: container.name }))) return;
    if (name === "restart" && !window.confirm(tt("docker.confirm.restart", { name: container.name }))) return;
    setBusyId(container.id);
    try {
      await api.dockerAction(alias, container.id, name);
      await refresh();
    } catch (actionError) {
      setError(tt("docker.action.failed", { error: actionError instanceof Error ? actionError.message : String(actionError) }));
    } finally {
      setBusyId(void 0);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshsp-toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dshsp-btn", onClick: () => void refresh(), children: tt("docker.refresh") }) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshsp-banner", "data-kind": "error", children: error }),
    containers === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshsp-loading", children: tt("common.loading") }) : containers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshsp-empty", children: tt("docker.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshsp-tablewrap", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("table", { className: "dshsp-table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: tt("docker.name") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: tt("docker.image") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: tt("docker.state") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: tt("docker.cpu") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: tt("docker.mem") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: tt("docker.ports") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: tt("docker.actions") })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("tbody", { children: containers.map((container) => {
        const running = container.state === "running";
        const busy = busyId === container.id;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "dshsp-mono", children: container.name }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "dshsp-mono dshsp-muted", children: container.image }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("td", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dshsp-badge", "data-state": container.state, children: container.state }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshsp-hint", children: container.status })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "dshsp-mono", children: container.cpuPercent ?? "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "dshsp-mono", children: container.memUsage?.split("/")[0]?.trim() ?? "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "dshsp-mono dshsp-muted", style: { maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: container.ports || "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dshsp-row-actions", children: [
            running ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dshsp-btn", disabled: busy, onClick: () => void action(container, "stop"), children: tt("docker.stop") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dshsp-btn", disabled: busy, onClick: () => void action(container, "start"), children: tt("docker.start") }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dshsp-btn", disabled: busy, onClick: () => void action(container, "restart"), children: tt("docker.restart") }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dshsp-btn", onClick: () => setLogsFor(container), children: tt("docker.logs") })
          ] }) })
        ] }, container.id);
      }) })
    ] }) }),
    logsFor && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LogsModal, { api, alias, container: logsFor, onClose: () => setLogsFor(void 0) })
  ] });
}
function LogsModal({ api, alias, container, onClose }) {
  const [text, setText] = (0, import_react3.useState)(tt("docker.logs.loading"));
  const [following, setFollowing] = (0, import_react3.useState)(false);
  const boxRef = (0, import_react3.useRef)(null);
  const socketRef = (0, import_react3.useRef)();
  const scrollToEnd = () => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  };
  (0, import_react3.useEffect)(() => {
    let cancelled = false;
    api.dockerLogs(alias, container.id, 300).then((logs) => {
      if (!cancelled) {
        setText(logs || "(no logs)");
        setTimeout(scrollToEnd, 50);
      }
    }).catch((error) => {
      if (!cancelled) setText(String(error instanceof Error ? error.message : error));
    });
    return () => {
      cancelled = true;
    };
  }, [api, alias, container.id]);
  (0, import_react3.useEffect)(() => () => {
    socketRef.current?.close();
  }, []);
  const toggleFollow = () => {
    if (following) {
      socketRef.current?.close();
      socketRef.current = void 0;
      setFollowing(false);
      return;
    }
    const socket = new WebSocket(api.dockerLogsFollowUrl(alias, container.id, 200));
    socketRef.current = socket;
    socket.onmessage = (event) => {
      try {
        const frame = JSON.parse(String(event.data));
        if (frame.type === "data" && typeof frame.text === "string") {
          setText((prev) => {
            const next = prev === tt("docker.logs.loading") ? frame.text : prev + frame.text;
            return next.length > 4e5 ? next.slice(-3e5) : next;
          });
          setTimeout(scrollToEnd, 30);
        }
      } catch {
      }
    };
    socket.onclose = () => setFollowing(false);
    socket.onerror = () => setFollowing(false);
    setFollowing(true);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshsp-modal-backdrop", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dshsp-modal dshsp-modal-lg", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { className: "dshsp-modal-title", children: tt("docker.logs.title", { name: container.name }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("pre", { ref: boxRef, className: "dshsp-logbox", children: text }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dshsp-modal-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dshsp-btn", "data-primary": following ? void 0 : "", onClick: toggleFollow, children: following ? tt("docker.logs.stop") : tt("docker.logs.follow") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dshsp-btn", onClick: onClose, children: tt("common.close") })
    ] })
  ] }) });
}

// src/client/panel/FilesTab.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
function joinPath(base, name) {
  return (base.endsWith("/") ? base : base + "/") + name;
}
function parentPath(path) {
  const trimmed = path.replace(/\/+$/, "");
  const index = trimmed.lastIndexOf("/");
  return index <= 0 ? "/" : trimmed.slice(0, index);
}
function formatMtime(mtimeSeconds) {
  if (!mtimeSeconds) return "-";
  const date = new Date(mtimeSeconds * 1e3);
  return date.toLocaleString();
}
function FilesTab({ api, alias }) {
  const [path, setPath] = (0, import_react4.useState)("/");
  const [entries, setEntries] = (0, import_react4.useState)();
  const [error, setError] = (0, import_react4.useState)();
  const [busy, setBusy] = (0, import_react4.useState)(false);
  const refresh = (0, import_react4.useCallback)(async (target) => {
    setBusy(true);
    try {
      const list = await api.fileList(alias, target);
      list.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
      setEntries(list.filter((entry) => entry.name !== "." && entry.name !== ".."));
      setError(void 0);
    } catch (listError) {
      setError(tt("files.failed", { error: listError instanceof Error ? listError.message : String(listError) }));
    } finally {
      setBusy(false);
    }
  }, [api, alias]);
  (0, import_react4.useEffect)(() => {
    setPath("/");
    setEntries(void 0);
    setError(void 0);
    void refresh("/");
  }, [refresh]);
  const navigate = (target) => {
    setPath(target);
    setEntries(void 0);
    void refresh(target);
  };
  const onMkdir = async () => {
    const name = window.prompt(tt("files.newdir.prompt"));
    if (!name) return;
    try {
      await api.fileMkdir(alias, joinPath(path, name.trim()));
      await refresh(path);
    } catch (mkdirError) {
      setError(String(mkdirError instanceof Error ? mkdirError.message : mkdirError));
    }
  };
  const onRename = async (entry) => {
    const name = window.prompt(tt("files.rename.prompt"), entry.name);
    if (!name || name === entry.name) return;
    try {
      await api.fileRename(alias, joinPath(path, entry.name), joinPath(path, name.trim()));
      await refresh(path);
    } catch (renameError) {
      setError(String(renameError instanceof Error ? renameError.message : renameError));
    }
  };
  const onDelete = async (entry) => {
    if (!window.confirm(tt(entry.isDir ? "files.delete.confirm.dir" : "files.delete.confirm", { name: entry.name }))) return;
    let recursive = false;
    if (entry.isDir) recursive = window.confirm(tt("files.delete.recursive") + "?");
    try {
      await api.fileDelete(alias, joinPath(path, entry.name), entry.isDir, recursive);
      await refresh(path);
    } catch (deleteError) {
      setError(String(deleteError instanceof Error ? deleteError.message : deleteError));
    }
  };
  const onDownload = async (entry) => {
    try {
      await api.fileDownload(alias, joinPath(path, entry.name));
    } catch (downloadError) {
      setError(String(downloadError instanceof Error ? downloadError.message : downloadError));
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshsp-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "dshsp-btn", onClick: () => navigate("/"), disabled: busy, children: tt("files.home") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "dshsp-btn", onClick: () => navigate(parentPath(path)), disabled: busy || path === "/", children: tt("files.up") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "dshsp-btn", onClick: () => void onMkdir(), disabled: busy, children: tt("files.newdir") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "dshsp-btn", onClick: () => navigate(path), disabled: busy, children: tt("common.refresh") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshsp-pathbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshsp-field-label", children: tt("files.path") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshsp-path", children: path })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshsp-banner", "data-kind": "error", children: error }),
    entries === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshsp-loading", children: tt("files.loading") }) : entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshsp-empty", children: tt("files.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshsp-tablewrap", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("table", { className: "dshsp-table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: tt("files.name") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: tt("files.size") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: tt("files.mtime") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: tt("files.actions") })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("tbody", { children: entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "span",
          {
            className: "dshsp-filename",
            "data-dir": entry.isDir ? "" : void 0,
            onClick: entry.isDir ? () => navigate(joinPath(path, entry.name)) : void 0,
            children: [
              entry.isDir ? "\u{1F4C1} " : "\u{1F4C4} ",
              entry.name
            ]
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { className: "dshsp-mono dshsp-muted", children: entry.isDir ? "-" : formatFileSize(entry.size) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { className: "dshsp-muted", children: formatMtime(entry.mtime) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshsp-row-actions", children: [
          !entry.isDir && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "dshsp-btn", onClick: () => void onDownload(entry), children: tt("common.download") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "dshsp-btn", onClick: () => void onRename(entry), children: tt("common.rename") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "dshsp-btn", "data-danger": "", onClick: () => void onDelete(entry), children: tt("common.delete") })
        ] }) })
      ] }, entry.name)) })
    ] }) })
  ] });
}

// src/client/panel/App.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function App({ api }) {
  const [hosts, setHosts] = (0, import_react5.useState)([]);
  const [loadError, setLoadError] = (0, import_react5.useState)();
  const [selectedAlias, setSelectedAlias] = (0, import_react5.useState)();
  const [tab, setTab] = (0, import_react5.useState)("docker");
  const [probes, setProbes] = (0, import_react5.useState)({});
  const [dialog, setDialog] = (0, import_react5.useState)(null);
  const [notice, setNotice] = (0, import_react5.useState)();
  const reload = (0, import_react5.useCallback)(async (keepSelection = true) => {
    try {
      const list = await api.listHosts();
      setHosts(list);
      setLoadError(void 0);
      setSelectedAlias((prev) => {
        if (keepSelection && prev && list.some((h) => h.alias === prev)) return prev;
        return list[0]?.alias;
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, [api]);
  (0, import_react5.useEffect)(() => {
    void reload();
  }, [reload]);
  const probe = (0, import_react5.useCallback)(async (alias) => {
    setProbes((prev) => ({ ...prev, [alias]: "testing" }));
    const result = await api.testSaved(alias).catch(() => void 0);
    setProbes((prev) => ({ ...prev, [alias]: result?.ok ? "ok" : "fail" }));
  }, [api]);
  const selected = hosts.find((h) => h.alias === selectedAlias);
  const onDelete = async (host) => {
    if (!window.confirm(tt("hosts.delete.confirm", { label: host.label }))) return;
    try {
      await api.deleteHost(host.alias);
      setNotice({ kind: "ok", text: "\u2713" });
      await reload(false);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : String(error) });
    }
  };
  const onSave = async (value, originalAlias) => {
    if (originalAlias) await api.updateHost(originalAlias, value);
    else await api.createHost(value);
    setDialog(null);
    await reload();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshsp-view", "data-dsh-server-panel-view": "", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshsp-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { className: "dshsp-title", children: tt("panel.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dshsp-btn", "data-primary": "", onClick: () => setDialog({ mode: "add" }), children: tt("hosts.add") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dshsp-btn", onClick: () => void reload(), children: tt("common.refresh") })
    ] }),
    notice && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { padding: "0 16px" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshsp-banner", "data-kind": notice.kind, children: notice.text }) }),
    loadError && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { padding: "0 16px" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshsp-banner", "data-kind": "error", children: tt("common.error", { error: loadError }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshsp-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshsp-hosts", children: [
        hosts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshsp-empty", children: tt("hosts.empty") }),
        hosts.map((host) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          "button",
          {
            className: "dshsp-hostcard",
            "data-active": host.alias === selectedAlias ? "" : void 0,
            onClick: () => setSelectedAlias(host.alias),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshsp-hostcard-top", children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-dot", "data-status": probes[host.alias] ?? "unknown" }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-hostname", children: host.label }),
                host.detectedKind === "dsm" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-badge", "data-kind": "dsm", children: "DSM" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshsp-hostaddr", children: [
                host.username,
                "@",
                host.host,
                ":",
                host.port
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshsp-hostmeta", children: [
                host.group && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-badge", children: host.group }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-hint", children: probes[host.alias] === "testing" ? tt("status.testing") : probes[host.alias] === "ok" ? "\u25CF online" : probes[host.alias] === "fail" ? tt("status.offline") : tt("status.unknown") }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { flex: 1 } }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-iconbtn", title: tt("hosts.test"), onClick: (e) => {
                  e.stopPropagation();
                  void probe(host.alias);
                }, children: "\u27F3" }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-iconbtn", title: tt("hosts.edit"), onClick: (e) => {
                  e.stopPropagation();
                  setDialog({ mode: "edit", host });
                }, children: "\u270E" }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-iconbtn", title: tt("hosts.delete"), onClick: (e) => {
                  e.stopPropagation();
                  void onDelete(host);
                }, children: "\u{1F5D1}" })
              ] })
            ]
          },
          host.alias
        ))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshsp-detail", children: selected ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DetailHeader, { api, host: selected, onChanged: () => void reload() }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshsp-tabs", children: ["docker", "overview", "files"].map((name) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dshsp-tab", "data-active": tab === name ? "" : void 0, onClick: () => setTab(name), children: tt(name === "docker" ? "tab.docker" : name === "overview" ? "tab.overview" : "tab.files") }, name)) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshsp-tabbody", children: [
          tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(OverviewTab, { api, alias: selected.alias }),
          tab === "docker" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DockerTab, { api, alias: selected.alias }),
          tab === "files" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(FilesTab, { api, alias: selected.alias })
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshsp-empty", children: tt("hosts.empty") }) })
    ] }),
    dialog && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      HostForm,
      {
        mode: dialog.mode,
        host: dialog.mode === "edit" ? dialog.host : void 0,
        api,
        onCancel: () => setDialog(null),
        onSave
      }
    )
  ] });
}
function DetailHeader({ api, host, onChanged }) {
  const [message, setMessage] = (0, import_react5.useState)();
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const run = async (action) => {
    if (action === "reboot" && !window.confirm(tt("power.reboot.confirm", { label: host.label }))) return;
    if (action === "shutdown" && !window.confirm(tt("power.shutdown.confirm", { label: host.label }))) return;
    setBusy(true);
    setMessage(void 0);
    try {
      if (action === "wol") {
        await api.wol(host.alias);
        setMessage({ kind: "ok", text: tt("power.wol.sent") });
      } else {
        await api.power(host.alias, action);
        setMessage({ kind: "ok", text: tt("power.sent") });
        onChanged();
      }
    } catch (error) {
      setMessage({ kind: "error", text: tt("power.failed", { error: error instanceof Error ? error.message : String(error) }) });
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshsp-detail-head", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-detail-title", children: host.label }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshsp-detail-sub", children: [
      host.username,
      "@",
      host.host,
      ":",
      host.port
    ] }),
    host.detectedKind && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-badge", "data-kind": host.detectedKind, children: tt(host.detectedKind === "dsm" ? "overview.kind.dsm" : "overview.kind.linux") }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-spacer" }),
    host.wolMac && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dshsp-btn", disabled: busy, onClick: () => void run("wol"), children: tt("power.wol") }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dshsp-btn", disabled: busy, onClick: () => void run("reboot"), children: tt("power.reboot") }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dshsp-btn", "data-danger": "", disabled: busy, onClick: () => void run("shutdown"), children: tt("power.shutdown") }),
    message && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshsp-hint", style: { color: message.kind === "error" ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-state-success-primary)" }, children: message.text })
  ] });
}

// src/client/register.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var SERVER_PANEL_ID = "server-panel";
var PANEL_ORDER = 50;
function ServerPanelIcon({ size }) {
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "svg",
    {
      "data-dsh-panel-entry": SERVER_PANEL_ID,
      viewBox: "0 0 16 16",
      width: size,
      height: size,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.4",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("rect", { x: "2", y: "1.75", width: "12", height: "5.5", rx: "1.25" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("rect", { x: "2", y: "8.75", width: "12", height: "5.5", rx: "1.25" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("circle", { cx: "4.25", cy: "4.5", r: "0.6", fill: "currentColor" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("circle", { cx: "4.25", cy: "11.5", r: "0.6", fill: "currentColor" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("path", { d: "M7 4.5h4.75M7 11.5h3" })
      ]
    }
  );
}
function registerServerPanel(ctx, api) {
  const slots = ctx.slots;
  const disposers = [];
  disposers.push(slots.inject("sidebar.panellist", () => slots.register({
    name: "sidebar.panellist",
    id: SERVER_PANEL_ID,
    order: PANEL_ORDER,
    label: () => tt("entry.label")
  }, ServerPanelIcon)));
  disposers.push(slots.inject("main", () => slots.register({
    name: "main",
    key: SERVER_PANEL_ID,
    inject: () => ({ api })
  }, App)));
  return () => {
    for (const dispose of disposers.splice(0)) dispose();
  };
}

// src/client/index.tsx
var NS = "dsh-server-panel";
var inject = ["slots", "locale", "layout"];
function apply(ctx) {
  ctx.effect(() => {
    try {
      return ctx.locale.register(NS, { zh, en });
    } catch {
      return () => {
      };
    }
  }, "server-panel: dictionaries");
  try {
    setRuntimeTranslate(ctx.locale.bind(NS));
  } catch {
  }
  const disposers = [];
  try {
    disposers.push(installStyles());
    disposers.push(registerServerPanel(ctx, new ServerPanelApi()));
  } catch (error) {
    console.warn("[dsh-server-panel] panel registration failed:", error);
  }
  ctx.effect(() => () => {
    for (const dispose of disposers.splice(0)) dispose();
  }, "server-panel: ui mounts");
}

		return module.exports;
	}
});
