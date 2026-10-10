// src/store.ts
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
var FILE_VERSION = 1;
function dshHome() {
  return process.env.DSH_HOME && process.env.DSH_HOME.trim() !== "" ? process.env.DSH_HOME : join(homedir(), ".dsh");
}
var ALIAS_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
function validateHostPayload(body, existing, originalAlias) {
  const problems = [];
  const alias = (body.alias ?? "").trim();
  if (!ALIAS_RE.test(alias)) problems.push("alias must start with a letter/digit and contain only letters, digits, - and _");
  if (alias !== originalAlias && existing.some((h) => h.alias === alias)) problems.push(`alias "${alias}" already exists`);
  if (!body.label || !String(body.label).trim()) problems.push("label is required");
  if (!body.host || !String(body.host).trim()) problems.push("host is required");
  const port = Number(body.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push("port must be an integer 1..65535");
  if (!body.username || !String(body.username).trim()) problems.push("username is required");
  if (body.authType !== "password" && body.authType !== "key") problems.push("authType must be password or key");
  if (body.authType === "key" && originalAlias === void 0 && !(body.privateKey && body.privateKey.trim()))
    problems.push("privateKey is required for key auth");
  if (body.authType === "password" && originalAlias === void 0 && !(body.password && body.password.length > 0))
    problems.push("password is required for password auth");
  if (body.wolMac && !/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(body.wolMac.trim()))
    problems.push("wolMac must look like 01:23:45:67:89:ab");
  if (body.portals !== void 0) {
    if (!Array.isArray(body.portals)) problems.push("portals must be an array");
    else for (const portal of body.portals) {
      if (!portal.name || !String(portal.name).trim()) problems.push("portal name is required");
      const port2 = Number(portal.port);
      if (!Number.isInteger(port2) || port2 < 1 || port2 > 65535) problems.push(`portal "${portal.name ?? "?"}" port must be 1..65535`);
      if (portal.mode !== "direct" && portal.mode !== "tunnel") problems.push(`portal "${portal.name ?? "?"}" mode must be direct or tunnel`);
    }
  }
  return problems;
}
var HostStore = class {
  file;
  hosts;
  constructor(file) {
    this.file = file ?? join(dshHome(), "dsh-server-panel.json");
    this.hosts = this.read();
  }
  read() {
    try {
      if (!existsSync(this.file)) return [];
      const parsed = JSON.parse(readFileSync(this.file, "utf8"));
      if (!Array.isArray(parsed.hosts)) return [];
      return parsed.hosts;
    } catch {
      return [];
    }
  }
  write() {
    const dir = dirname(this.file);
    mkdirSync(dir, { recursive: true, mode: 448 });
    const tmp = `${this.file}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify({ version: FILE_VERSION, hosts: this.hosts }, null, 2), { mode: 384 });
    renameSync(tmp, this.file);
    try {
      chmodSync(this.file, 384);
    } catch {
    }
  }
  list() {
    return [...this.hosts];
  }
  get(alias) {
    return this.hosts.find((h) => h.alias === alias);
  }
  create(payload) {
    const problems = validateHostPayload(payload, this.hosts);
    if (problems.length > 0) throw new Error(problems.join("; "));
    const entry = {
      ...payload,
      alias: payload.alias.trim(),
      port: Number(payload.port)
    };
    this.hosts.push(entry);
    this.write();
    return entry;
  }
  update(originalAlias, patch) {
    const index = this.hosts.findIndex((h) => h.alias === originalAlias);
    if (index < 0) throw new Error(`unknown host alias: ${originalAlias}`);
    const current = this.hosts[index];
    const merged = {
      ...current,
      ...patch,
      alias: (patch.alias ?? current.alias).trim(),
      port: Number(patch.port ?? current.port),
      // Empty credential fields keep the stored secret.
      password: patch.authType === "key" ? void 0 : patch.password === "" || patch.password === void 0 ? current.password : patch.password,
      privateKey: patch.authType === "password" ? void 0 : patch.privateKey === "" || patch.privateKey === void 0 ? current.privateKey : patch.privateKey,
      passphrase: patch.passphrase === "" || patch.passphrase === void 0 ? current.passphrase : patch.passphrase
    };
    const problems = validateHostPayload(merged, this.hosts, originalAlias);
    if (problems.length > 0) throw new Error(problems.join("; "));
    if (merged.host !== current.host || merged.port !== current.port || merged.username !== current.username || merged.authType !== current.authType || patch.password || patch.privateKey) {
      delete merged.detectedKind;
      delete merged.dockerCommand;
    }
    this.hosts[index] = merged;
    this.write();
    return merged;
  }
  remove(alias) {
    const before = this.hosts.length;
    this.hosts = this.hosts.filter((h) => h.alias !== alias);
    if (this.hosts.length !== before) this.write();
    return this.hosts.length !== before;
  }
  /** Persist detection caches (kind / working docker command). */
  remember(alias, patch) {
    const entry = this.hosts.find((h) => h.alias === alias);
    if (!entry) return;
    Object.assign(entry, patch);
    this.write();
  }
  /** Strip secrets for the wire. */
  summarize(entry) {
    return {
      alias: entry.alias,
      label: entry.label,
      host: entry.host,
      port: entry.port,
      username: entry.username,
      authType: entry.authType,
      group: entry.group,
      hasPassword: !!entry.password,
      hasKey: !!entry.privateKey,
      wolMac: entry.wolMac,
      wolBroadcast: entry.wolBroadcast,
      notes: entry.notes,
      detectedKind: entry.detectedKind,
      portals: entry.portals
    };
  }
};

// src/engine.ts
import { Client as SshClient } from "ssh2";
import { createSocket } from "node:dgram";
import { createServer } from "node:net";
var IDLE_TIMEOUT_MS = 15 * 60 * 1e3;
var READY_TIMEOUT_MS = 15e3;
var EXEC_TIMEOUT_MS = 3e4;
var MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
function shq(value) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}
function connectConfigFor(entry) {
  const config = {
    host: entry.host,
    port: entry.port,
    username: entry.username,
    readyTimeout: READY_TIMEOUT_MS,
    keepaliveInterval: 2e4,
    keepaliveCountMax: 3
  };
  if (entry.authType === "password") config.password = entry.password;
  else {
    config.privateKey = entry.privateKey;
    if (entry.passphrase) config.passphrase = entry.passphrase;
  }
  return config;
}
var ServerEngine = class _ServerEngine {
  store;
  pool = /* @__PURE__ */ new Map();
  /** Serialize pool creation per alias so concurrent probes share one handshake. */
  connecting = /* @__PURE__ */ new Map();
  constructor(store) {
    this.store = store;
  }
  // ------------------------------------------------------------- pool
  connectConfig(entry) {
    return connectConfigFor(entry);
  }
  /**
   * Test connectivity for a host payload that may not be saved yet (the
   * form's "test" button). Uses a throwaway connection, never the pool.
   */
  async testPayload(payload) {
    const started = Date.now();
    const client = new SshClient();
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("handshake timed out")), READY_TIMEOUT_MS);
        client.once("ready", () => {
          clearTimeout(timer);
          resolve();
        });
        client.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        client.connect(connectConfigFor(payload));
      });
      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("probe timed out")), 1e4);
        client.exec("echo __SP_OK__; uname -sr; test -f /etc/synoinfo.conf && echo DSM || echo LINUX", (error, channel) => {
          if (error) {
            clearTimeout(timer);
            reject(error);
            return;
          }
          const chunks = [];
          let code = -1;
          channel.on("data", (d) => chunks.push(d));
          channel.on("exit", (c) => {
            code = c ?? -1;
          });
          channel.on("close", () => {
            clearTimeout(timer);
            resolve({ code, stdout: Buffer.concat(chunks).toString("utf8"), stderr: "" });
          });
        });
      });
      const latencyMs = Date.now() - started;
      if (!result.stdout.includes("__SP_OK__")) {
        return { ok: false, latencyMs, error: result.stdout.trim().slice(0, 300) || `exit ${result.code}` };
      }
      return {
        ok: true,
        latencyMs,
        kind: result.stdout.includes("DSM") ? "dsm" : "linux",
        banner: result.stdout.replace("__SP_OK__", "").trim()
      };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
    } finally {
      try {
        client.end();
      } catch {
      }
    }
  }
  drop(alias) {
    const entry = this.pool.get(alias);
    if (!entry) return;
    this.pool.delete(alias);
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    try {
      entry.client.end();
    } catch {
    }
  }
  /** Drop the pooled connection (config change / delete / repeated failure). */
  invalidate(alias) {
    this.drop(alias);
  }
  touch(alias, entry) {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => this.drop(alias), IDLE_TIMEOUT_MS);
    entry.idleTimer.unref?.();
  }
  connection(alias) {
    const pooled = this.pool.get(alias);
    if (pooled) {
      this.touch(alias, pooled);
      return Promise.resolve(pooled.client);
    }
    const pending = this.connecting.get(alias);
    if (pending) return pending;
    const host = this.store.get(alias);
    if (!host) return Promise.reject(new Error(`unknown host alias: ${alias}`));
    const promise = new Promise((resolve, reject) => {
      const client = new SshClient();
      let settled = false;
      client.on("ready", () => {
        settled = true;
        const entry = { client, idleTimer: void 0 };
        this.pool.set(alias, entry);
        this.touch(alias, entry);
        resolve(client);
      });
      client.on("error", (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
        this.drop(alias);
      });
      client.on("close", () => {
        if (this.pool.get(alias)?.client === client) this.drop(alias);
      });
      try {
        client.connect(this.connectConfig(host));
      } catch (error) {
        reject(error);
      }
    }).finally(() => {
      if (this.connecting.get(alias) === promise) this.connecting.delete(alias);
    });
    this.connecting.set(alias, promise);
    return promise;
  }
  // ------------------------------------------------------------- exec
  /**
   * Run one command over the pooled connection. `tolerateAbruptClose` is for
   * power actions: reboot/shutdown kills the session mid-exec, which is the
   * expected success shape.
   */
  async exec(alias, command, options) {
    const client = await this.connection(alias);
    const timeoutMs = options?.timeoutMs ?? EXEC_TIMEOUT_MS;
    return new Promise((resolve, reject) => {
      let stdoutLen = 0;
      let stderrLen = 0;
      const stdoutChunks = [];
      const stderrChunks = [];
      let settled = false;
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (options?.tolerateAbruptClose) client.removeListener("close", onClientClose);
        fn();
      };
      const timer = setTimeout(() => {
        finish(() => reject(new Error(`exec timed out after ${timeoutMs}ms`)));
        try {
          stream?.close();
        } catch {
        }
      }, timeoutMs);
      let stream;
      const onClientClose = () => {
        if (options?.tolerateAbruptClose) {
          finish(() => resolve({ code: 0, stdout: Buffer.concat(stdoutChunks).toString("utf8"), stderr: "" }));
        }
      };
      client.exec(command, (error, channel) => {
        if (error) {
          finish(() => reject(error));
          return;
        }
        stream = channel;
        let exitCode = -1;
        channel.on("data", (data) => {
          if (stdoutLen < MAX_OUTPUT_BYTES) {
            stdoutChunks.push(data);
            stdoutLen += data.length;
          }
        });
        channel.stderr.on("data", (data) => {
          if (stderrLen < MAX_OUTPUT_BYTES) {
            stderrChunks.push(data);
            stderrLen += data.length;
          }
        });
        channel.on("exit", (code) => {
          exitCode = code ?? -1;
        });
        channel.on("close", () => {
          finish(() => resolve({
            code: exitCode,
            stdout: Buffer.concat(stdoutChunks).toString("utf8"),
            stderr: Buffer.concat(stderrChunks).toString("utf8")
          }));
        });
        channel.on("error", (channelError) => {
          if (options?.tolerateAbruptClose) {
            finish(() => resolve({ code: 0, stdout: Buffer.concat(stdoutChunks).toString("utf8"), stderr: "" }));
          } else {
            finish(() => reject(channelError));
          }
        });
      });
      if (options?.tolerateAbruptClose) client.once("close", onClientClose);
    });
  }
  // ------------------------------------------------------------- probe
  /** Sections probe: one round trip, /proc-based so busybox (DSM) works. */
  static STATUS_COMMAND = [
    "printf '__HOSTNAME__\\n'; hostname",
    "printf '__KERNEL__\\n'; uname -sr",
    "printf '__UPTIME__\\n'; cat /proc/uptime",
    "printf '__LOAD__\\n'; cat /proc/loadavg",
    "printf '__MEM__\\n'; grep -E '^(MemTotal|MemAvailable|MemFree|Buffers|Cached):' /proc/meminfo",
    "printf '__NPROC__\\n'; grep -c ^processor /proc/cpuinfo",
    "printf '__DSM__\\n'; test -f /etc/synoinfo.conf && echo yes || echo no",
    "printf '__DF__\\n'; df -k 2>/dev/null",
    "printf '__END__\\n'"
  ].join("; ");
  static parseSections(text) {
    const sections = {};
    let current = "";
    for (const line of text.split("\n")) {
      const marker = line.match(/^__([A-Z]+)__\s*$/);
      if (marker) {
        current = marker[1];
        sections[current] = "";
      } else if (current) {
        sections[current] += (sections[current] === "" ? "" : "\n") + line;
      }
    }
    return sections;
  }
  async status(alias) {
    const result = await this.exec(alias, _ServerEngine.STATUS_COMMAND, { timeoutMs: 2e4 });
    if (result.code !== 0 && result.stdout.trim() === "") {
      throw new Error(`status probe failed (exit ${result.code}): ${result.stderr.trim().slice(0, 300)}`);
    }
    const sections = _ServerEngine.parseSections(result.stdout);
    const uptimeSeconds = Number.parseFloat((sections.UPTIME ?? "0").split(/\s+/)[0] ?? "0") || 0;
    const loadParts = (sections.LOAD ?? "").trim().split(/\s+/);
    const mem = { total: 0, available: 0 };
    let memFree = 0, buffers = 0, cached = 0;
    for (const line of (sections.MEM ?? "").split("\n")) {
      const match = line.match(/^(\w+):\s+(\d+)\s*kB/);
      if (!match) continue;
      const kb = Number.parseInt(match[2], 10);
      if (match[1] === "MemTotal") mem.total = kb;
      else if (match[1] === "MemAvailable") mem.available = kb;
      else if (match[1] === "MemFree") memFree = kb;
      else if (match[1] === "Buffers") buffers = kb;
      else if (match[1] === "Cached") cached = kb;
    }
    if (mem.available === 0) mem.available = memFree + buffers + cached;
    const disks = [];
    const dfLines = (sections.DF ?? "").split("\n").slice(1);
    const skipFs = /^(tmpfs|devtmpfs|overlay|squashfs|ramfs|none|udev)/;
    for (const line of dfLines) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 6) continue;
      const [filesystem, totalKb, usedKb, availKb, usePercent] = cols;
      const mount = cols.slice(5).join(" ");
      if (skipFs.test(filesystem)) continue;
      if (mount.startsWith("/run") || mount.startsWith("/dev") || mount.startsWith("/sys") || mount.startsWith("/snap")) continue;
      const total = Number.parseInt(totalKb, 10);
      if (!Number.isFinite(total) || total <= 0) continue;
      disks.push({
        filesystem,
        mount,
        totalKb: total,
        usedKb: Number.parseInt(usedKb, 10) || 0,
        availKb: Number.parseInt(availKb, 10) || 0,
        usePercent: Number.parseInt((usePercent ?? "0").replace("%", ""), 10) || 0
      });
    }
    const kind = (sections.DSM ?? "").trim() === "yes" ? "dsm" : "linux";
    if (this.store.get(alias)?.detectedKind !== kind) this.store.remember(alias, { detectedKind: kind });
    return {
      hostname: (sections.HOSTNAME ?? "").trim(),
      kernel: (sections.KERNEL ?? "").trim(),
      kind,
      uptimeSeconds,
      loadAvg: [
        Number.parseFloat(loadParts[0] ?? "0") || 0,
        Number.parseFloat(loadParts[1] ?? "0") || 0,
        Number.parseFloat(loadParts[2] ?? "0") || 0
      ],
      cpuCount: Number.parseInt((sections.NPROC ?? "0").trim(), 10) || 0,
      memTotalKb: mem.total,
      memAvailableKb: mem.available,
      disks
    };
  }
  /** Quick connectivity probe; also used by the form's test button. */
  async test(alias) {
    const started = Date.now();
    try {
      const result = await this.exec(alias, "echo __SP_OK__; uname -sr; test -f /etc/synoinfo.conf && echo DSM || echo LINUX", { timeoutMs: READY_TIMEOUT_MS + 5e3 });
      const latencyMs = Date.now() - started;
      if (!result.stdout.includes("__SP_OK__")) {
        return { ok: false, latencyMs, error: (result.stderr || result.stdout).trim().slice(0, 300) || `exit ${result.code}` };
      }
      const kind = result.stdout.includes("DSM") ? "dsm" : "linux";
      this.store.remember(alias, { detectedKind: kind });
      return { ok: true, latencyMs, kind, banner: result.stdout.replace("__SP_OK__", "").trim() };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // ------------------------------------------------------------- docker
  /**
   * Docker CLI invocation modes, tried in order. `sudo -S` modes pipe the
   * stored SSH password into sudo's stdin (echo is a shell builtin, so the
   * password never appears in the remote process list). Only offered when
   * the host uses password auth.
   */
  dockerModes(entry) {
    const modes = ["docker", "/usr/local/bin/docker", "sudo -n docker", "sudo -n /usr/local/bin/docker"];
    if (entry.authType === "password" && entry.password) {
      modes.push("sudo -S docker", "sudo -S /usr/local/bin/docker");
    }
    return modes;
  }
  /** Expand a stored docker mode into the full command prefix for a host. */
  dockerPrefix(entry, mode) {
    if (mode.startsWith("sudo -S ")) {
      return `echo ${shq(entry.password ?? "")} | sudo -S -p '' ${mode.slice("sudo -S ".length)}`;
    }
    return mode;
  }
  /** Resolve the working docker CLI for a host, caching the winning mode. */
  async dockerCommand(alias) {
    const host = this.store.get(alias);
    if (!host) throw new Error(`unknown host alias: ${alias}`);
    if (host.dockerCommand) return this.dockerPrefix(host, host.dockerCommand);
    for (const mode of this.dockerModes(host)) {
      try {
        const probe = await this.exec(alias, `${this.dockerPrefix(host, mode)} version --format '{{.Server.Version}}'`, { timeoutMs: 1e4 });
        if (probe.code === 0 && probe.stdout.trim() !== "") {
          this.store.remember(alias, { dockerCommand: mode });
          return this.dockerPrefix(host, mode);
        }
      } catch {
      }
    }
    throw new Error("docker is not reachable on this host (tried docker, sudo -n, and sudo with the stored password); check that the SSH user can run docker");
  }
  /**
   * Run one docker operation. When the cached invocation mode starts failing
   * with an auth/not-found shape (host changed under us), forget it and retry
   * once through the full resolution.
   */
  async withDocker(alias, fn) {
    const docker = await this.dockerCommand(alias);
    try {
      return await fn(docker);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const hadCache = this.store.get(alias)?.dockerCommand !== void 0;
      if (hadCache && /not found|permission denied|sudo|a password is required/i.test(message)) {
        this.store.remember(alias, { dockerCommand: void 0 });
        return fn(await this.dockerCommand(alias));
      }
      throw error;
    }
  }
  async dockerList(alias) {
    return this.withDocker(alias, async (docker) => {
      const format = "'{{json .}}'";
      const list = await this.exec(alias, `${docker} ps -a --format ${format}`, { timeoutMs: 2e4 });
      if (list.code !== 0) throw new Error(list.stderr.trim() || `docker ps failed (exit ${list.code})`);
      const containers = [];
      for (const line of list.stdout.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const row = JSON.parse(trimmed);
          containers.push({
            id: row.ID ?? "",
            name: (row.Names ?? "").replace(/^\//, ""),
            image: row.Image ?? "",
            state: row.State ?? "",
            status: row.Status ?? "",
            ports: row.Ports ?? "",
            createdAt: row.CreatedAt ?? ""
          });
        } catch {
        }
      }
      try {
        const stats = await this.exec(alias, `${docker} stats --no-stream --format ${format}`, { timeoutMs: 15e3 });
        if (stats.code === 0) {
          const byId = new Map(containers.map((c) => [c.id, c]));
          for (const line of stats.stdout.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const row = JSON.parse(trimmed);
              const target = byId.get(row.ID ?? "") ?? containers.find((c) => c.name === (row.Name ?? ""));
              if (target) {
                target.cpuPercent = row.CPUPerc;
                target.memUsage = row.MemUsage;
              }
            } catch {
            }
          }
        }
      } catch {
      }
      return containers;
    });
  }
  async dockerAction(alias, id, action) {
    if (!/^[a-f0-9]{6,64}$/i.test(id) && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id)) throw new Error("invalid container id");
    await this.withDocker(alias, async (docker) => {
      const result = await this.exec(alias, `${docker} ${action} ${shq(id)}`, { timeoutMs: 6e4 });
      if (result.code !== 0) throw new Error(result.stderr.trim() || `docker ${action} failed (exit ${result.code})`);
    });
  }
  async dockerLogs(alias, id, tail) {
    const safeTail = Math.min(Math.max(Math.floor(tail) || 200, 1), 5e3);
    return this.withDocker(alias, async (docker) => {
      const result = await this.exec(alias, `${docker} logs --tail ${safeTail} ${shq(id)} 2>&1`, { timeoutMs: 3e4 });
      return result.stdout;
    });
  }
  /**
   * Open a streaming `docker logs -f` channel for the WebSocket surface.
   * Callers get the raw channel; closing it ends the remote command.
   */
  async dockerLogsChannel(alias, id, tail) {
    const client = await this.connection(alias);
    const docker = await this.dockerCommand(alias);
    const safeTail = Math.min(Math.max(Math.floor(tail) || 200, 1), 5e3);
    return new Promise((resolve, reject) => {
      client.exec(`${docker} logs -f --tail ${safeTail} ${shq(id)} 2>&1`, (error, channel) => {
        if (error) reject(error);
        else resolve(channel);
      });
    });
  }
  // ------------------------------------------------------------- files
  withSftp(alias, fn) {
    return this.connection(alias).then((client) => new Promise((resolve, reject) => {
      client.sftp((error, sftp) => {
        if (error) {
          reject(error);
          return;
        }
        fn(sftp).then(resolve, reject).finally(() => {
          try {
            sftp.end();
          } catch {
          }
        });
      });
    }));
  }
  async fileList(alias, remotePath) {
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (error, list) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(list.map((item) => ({
          name: item.filename,
          isDir: item.attrs.isDirectory(),
          size: item.attrs.size,
          mtime: item.attrs.mtime,
          mode: item.attrs.mode ?? 0
        })));
      });
    }));
  }
  /** Open an SFTP read stream; caller pipes it into the HTTP response. */
  async fileDownloadStream(alias, remotePath) {
    const client = await this.connection(alias);
    const sftp = await new Promise((resolve, reject) => {
      client.sftp((error, sftp2) => error ? reject(error) : resolve(sftp2));
    });
    try {
      const stat = await new Promise((resolve, reject) => {
        sftp.stat(remotePath, (error, stats) => {
          if (error) reject(error);
          else resolve({ size: stats.size, isDir: stats.isDirectory() });
        });
      });
      if (stat.isDir) throw new Error("cannot download a directory");
      const stream = sftp.createReadStream(remotePath);
      const cleanup = () => {
        try {
          sftp.end();
        } catch {
        }
      };
      stream.on("close", cleanup);
      stream.on("error", cleanup);
      return { stream, size: stat.size };
    } catch (error) {
      try {
        sftp.end();
      } catch {
      }
      throw error;
    }
  }
  async fileMkdir(alias, remotePath) {
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (error) => error ? reject(error) : resolve());
    }));
  }
  async fileRename(alias, from, to) {
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      sftp.rename(from, to, (error) => error ? reject(error) : resolve());
    }));
  }
  /**
   * Delete a remote file (unlink), an empty directory (rmdir), or a whole
   * directory tree when recursive is set (falls back to exec rm -rf).
   */
  async fileDelete(alias, remotePath, isDir, recursive) {
    if (isDir && recursive) {
      if (remotePath === "/" || remotePath.trim() === "") throw new Error("refusing to delete root");
      const result = await this.exec(alias, `rm -rf -- ${shq(remotePath)}`, { timeoutMs: 12e4 });
      if (result.code !== 0) throw new Error(result.stderr.trim() || `rm failed (exit ${result.code})`);
      return;
    }
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      const done = (error) => error ? reject(error) : resolve();
      if (isDir) sftp.rmdir(remotePath, done);
      else sftp.unlink(remotePath, done);
    }));
  }
  // ------------------------------------------------------------- terminal
  /**
   * Open an interactive PTY shell on the host. The caller owns the channel:
   * closing it ends the remote shell.
   */
  async shellChannel(alias, cols, rows) {
    const client = await this.connection(alias);
    return new Promise((resolve, reject) => {
      client.shell(
        { term: "xterm-256color", cols: Math.max(cols | 0, 20), rows: Math.max(rows | 0, 5) },
        (error, channel) => error ? reject(error) : resolve(channel)
      );
    });
  }
  // ------------------------------------------------------------- tunnels
  /** Live local-forward tunnels, keyed by `${alias}:${remotePort}`. */
  tunnels = /* @__PURE__ */ new Map();
  listTunnels(alias) {
    return [...this.tunnels.values()].filter((t) => alias === void 0 || t.info.alias === alias).map((t) => t.info);
  }
  /**
   * Open (or reuse) a local forward: 127.0.0.1:<localPort> on the DSH host →
   * 127.0.0.1:<remotePort> on the remote. The URL answers the browser.
   */
  async openTunnel(alias, remotePort) {
    const key = `${alias}:${remotePort}`;
    const existing = this.tunnels.get(key);
    if (existing) return existing.info;
    if (!Number.isInteger(remotePort) || remotePort < 1 || remotePort > 65535) throw new Error("invalid remote port");
    const client = await this.connection(alias);
    const server = createServer((socket) => {
      client.forwardOut("127.0.0.1", socket.localPort ?? 0, "127.0.0.1", remotePort, (error, channel) => {
        if (error) {
          socket.destroy();
          return;
        }
        socket.pipe(channel).pipe(socket);
        socket.on("error", () => {
          try {
            channel.close();
          } catch {
          }
        });
        channel.on("error", () => {
          try {
            socket.destroy();
          } catch {
          }
        });
      });
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const localPort = server.address().port;
    const info = { alias, remotePort, localPort, url: `http://127.0.0.1:${localPort}` };
    this.tunnels.set(key, { server, info });
    server.on("close", () => {
      if (this.tunnels.get(key)?.server === server) this.tunnels.delete(key);
    });
    return info;
  }
  async stopTunnel(alias, remotePort) {
    const key = `${alias}:${remotePort}`;
    const entry = this.tunnels.get(key);
    if (!entry) return false;
    this.tunnels.delete(key);
    await new Promise((resolve) => {
      entry.server.close(() => resolve());
    });
    return true;
  }
  // ------------------------------------------------------------- power
  async power(alias, action) {
    const host = this.store.get(alias);
    if (!host) throw new Error(`unknown host alias: ${alias}`);
    const sudoPw = host.authType === "password" && host.password ? `echo ${shq(host.password)} | sudo -S -p ''` : void 0;
    const chains = action === "reboot" ? [sudoPw && `${sudoPw} reboot`, "sudo -n reboot 2>/dev/null", "reboot 2>/dev/null", sudoPw && `${sudoPw} systemctl reboot`, "sudo -n systemctl reboot 2>/dev/null", sudoPw && `${sudoPw} shutdown -r now`] : [sudoPw && `${sudoPw} shutdown -h now`, "sudo -n shutdown -h now 2>/dev/null", sudoPw && `${sudoPw} poweroff`, "sudo -n poweroff 2>/dev/null", "poweroff 2>/dev/null", sudoPw && `${sudoPw} systemctl poweroff`];
    const command = chains.filter((c) => typeof c === "string").join(" || ");
    const result = await this.exec(alias, command, { timeoutMs: 15e3, tolerateAbruptClose: true });
    if (result.code > 0) {
      throw new Error(result.stderr.trim() || `${action} command failed (exit ${result.code}); does the SSH user have sudo rights?`);
    }
    this.drop(alias);
  }
  /** Send a Wake-on-LAN magic packet from the DSH host onto the LAN. */
  async wol(alias) {
    const host = this.store.get(alias);
    if (!host) throw new Error(`unknown host alias: ${alias}`);
    const mac = (host.wolMac ?? "").trim();
    const match = mac.match(/^([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})$/i);
    if (!match) throw new Error("this host has no valid wolMac configured");
    const macBytes = Buffer.from(match.slice(1).join(""), "hex");
    const packet = Buffer.alloc(6 + 16 * 6, 255);
    for (let i = 0; i < 16; i++) macBytes.copy(packet, 6 + i * 6);
    const broadcast = (host.wolBroadcast ?? "255.255.255.255").trim() || "255.255.255.255";
    await new Promise((resolve, reject) => {
      const socket = createSocket("udp4");
      socket.once("error", (error) => {
        socket.close();
        reject(error);
      });
      socket.bind(() => {
        socket.setBroadcast(true);
        socket.send(packet, 0, packet.length, 9, broadcast, (error) => {
          socket.close();
          if (error) reject(error);
          else resolve();
        });
      });
    });
  }
  // ------------------------------------------------------------- lifecycle
  dispose() {
    for (const key of [...this.tunnels.keys()]) {
      const [alias, port] = key.split(":");
      void this.stopTunnel(alias, Number(port));
    }
    for (const alias of [...this.pool.keys()]) this.drop(alias);
  }
};

// src/routes.ts
import { WebSocketServer } from "ws";

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
  dockerLogsFollow: "/api/dsh-server-panel/docker/logs-follow",
  /** WebSocket upgrade path for the interactive PTY terminal. */
  terminal: "/api/dsh-server-panel/terminal",
  tunnel: "/api/dsh-server-panel/tunnel",
  tunnels: "/api/dsh-server-panel/tunnels"
};

// src/http.ts
var MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_JSON_BODY_BYTES) {
        req.destroy();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}
function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(text);
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/loopback.ts
function isIPv4Loopback(v4) {
  const parts = v4.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
function isLoopbackAddress(address) {
  if (!address) return false;
  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) return isIPv4Loopback(normalized.slice("::ffff:".length));
  return isIPv4Loopback(normalized);
}
function isLoopbackHostname(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  return isIPv4Loopback(hostname);
}
function isLoopbackRequest(req) {
  if (!isLoopbackAddress(req.socket.remoteAddress)) return false;
  const host = req.headers.host;
  if (typeof host === "string" && host !== "") {
    let hostUrl;
    try {
      hostUrl = new URL("http://" + host);
    } catch {
      return false;
    }
    if (!isLoopbackHostname(hostUrl.hostname)) return false;
  }
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  return true;
}

// src/routes.ts
function queryParam(url, name2) {
  const value = url.searchParams.get(name2);
  return value === null ? void 0 : value;
}
function requiredParam(url, name2) {
  const value = queryParam(url, name2);
  if (value === void 0 || value === "") throw new Error(`${name2} query parameter is required`);
  return value;
}
function makeRoutes(deps) {
  const { store, engine } = deps;
  const fence = (req, res) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { error: "forbidden: loopback-only" });
      return false;
    }
    return true;
  };
  const routes = [
    // ------------------------------------------------------------ hosts
    {
      kind: "exact",
      path: API.hosts,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        const method = req.method ?? "GET";
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          if (method === "GET") {
            writeJson(res, 200, { hosts: store.list().map((entry) => store.summarize(entry)) });
            return;
          }
          if (method === "POST") {
            const body = await readJsonBody(req);
            if (body === null) {
              writeJson(res, 400, { error: "invalid JSON body" });
              return;
            }
            const entry = store.create(body);
            writeJson(res, 201, { host: store.summarize(entry) });
            return;
          }
          if (method === "PATCH" || method === "DELETE") {
            const alias = requiredParam(url, "alias");
            if (method === "DELETE") {
              if (!store.remove(alias)) {
                writeJson(res, 404, { error: `unknown host alias: ${alias}` });
                return;
              }
              engine.invalidate(alias);
              writeJson(res, 200, { ok: true });
              return;
            }
            const body = await readJsonBody(req);
            if (body === null) {
              writeJson(res, 400, { error: "invalid JSON body" });
              return;
            }
            const entry = store.update(alias, body);
            engine.invalidate(entry.alias);
            if (entry.alias !== alias) engine.invalidate(alias);
            writeJson(res, 200, { host: store.summarize(entry) });
            return;
          }
          writeJson(res, 405, { error: `method not allowed: ${method}` });
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) });
        }
      }
    },
    // ------------------------------------------------------------ test
    {
      kind: "exact",
      path: API.test,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          if (typeof body.alias === "string" && body.payload === void 0) {
            writeJson(res, 200, await engine.test(body.alias));
            return;
          }
          const payload = body.payload;
          if (!payload || typeof payload.host !== "string" || typeof payload.username !== "string") {
            writeJson(res, 400, { error: "payload with host/username is required" });
            return;
          }
          const probe = Object.assign(
            { alias: "_probe", label: "_probe", host: "", port: 22, username: "", authType: "password" },
            payload
          );
          writeJson(res, 200, await engine.testPayload(probe));
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) });
        }
      }
    },
    // ------------------------------------------------------------ status
    {
      kind: "exact",
      path: API.status,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "GET") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          writeJson(res, 200, { status: await engine.status(requiredParam(url, "alias")) });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    // ------------------------------------------------------------ docker
    {
      kind: "exact",
      path: API.dockerContainers,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "GET") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          writeJson(res, 200, { containers: await engine.dockerList(requiredParam(url, "alias")) });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    {
      kind: "exact",
      path: API.dockerAction,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          const action = String(body.action);
          if (action !== "start" && action !== "stop" && action !== "restart") throw new Error("action must be start|stop|restart");
          await engine.dockerAction(String(body.alias), String(body.id), action);
          writeJson(res, 200, { ok: true });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    {
      kind: "exact",
      path: API.dockerLogs,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "GET") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          const tail = Number(queryParam(url, "tail") ?? "200");
          writeJson(res, 200, { logs: await engine.dockerLogs(requiredParam(url, "alias"), requiredParam(url, "id"), tail) });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    // ------------------------------------------------------------ power
    {
      kind: "exact",
      path: API.power,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          const action = String(body.action);
          if (action !== "reboot" && action !== "shutdown") throw new Error("action must be reboot|shutdown");
          await engine.power(String(body.alias), action);
          writeJson(res, 200, { ok: true });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    {
      kind: "exact",
      path: API.wol,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          await engine.wol(String(body.alias));
          writeJson(res, 200, { ok: true });
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) });
        }
      }
    },
    // ------------------------------------------------------------ files
    {
      kind: "exact",
      path: API.filesList,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "GET") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          const entries = await engine.fileList(requiredParam(url, "alias"), requiredParam(url, "path"));
          writeJson(res, 200, { entries });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    {
      kind: "exact",
      path: API.filesDownload,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "GET") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          const remotePath = requiredParam(url, "path");
          const { stream, size } = await engine.fileDownloadStream(requiredParam(url, "alias"), remotePath);
          const name2 = remotePath.replace(/\/+$/, "").split("/").pop() ?? "download";
          res.writeHead(200, {
            "content-type": "application/octet-stream",
            "content-length": String(size),
            "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name2)}`,
            "cache-control": "no-store"
          });
          stream.on("error", () => {
            try {
              res.destroy();
            } catch {
            }
          });
          stream.pipe(res);
        } catch (error) {
          if (!res.headersSent) writeJson(res, 502, { error: errorMessage(error) });
          else try {
            res.destroy();
          } catch {
          }
        }
      }
    },
    {
      kind: "exact",
      path: API.filesMkdir,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          await engine.fileMkdir(String(body.alias), String(body.path));
          writeJson(res, 200, { ok: true });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    {
      kind: "exact",
      path: API.filesRename,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          await engine.fileRename(String(body.alias), String(body.from), String(body.to));
          writeJson(res, 200, { ok: true });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    {
      kind: "exact",
      path: API.filesDelete,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          await engine.fileDelete(String(body.alias), String(body.path), body.isDir === true, body.recursive === true);
          writeJson(res, 200, { ok: true });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    // ------------------------------------------------------------ tunnels
    {
      kind: "exact",
      path: API.tunnel,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method not allowed" });
          return;
        }
        const body = await readJsonBody(req);
        if (body === null) {
          writeJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        try {
          writeJson(res, 200, { tunnel: await engine.openTunnel(String(body.alias), Number(body.port)) });
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) });
        }
      }
    },
    {
      kind: "exact",
      path: API.tunnels,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        const url = new URL(req.url ?? "/", "http://localhost");
        if (req.method === "GET") {
          writeJson(res, 200, { tunnels: engine.listTunnels(queryParam(url, "alias")) });
          return;
        }
        if (req.method === "DELETE") {
          try {
            const stopped = await engine.stopTunnel(requiredParam(url, "alias"), Number(requiredParam(url, "port")));
            writeJson(res, stopped ? 200 : 404, { ok: stopped });
          } catch (error) {
            writeJson(res, 400, { error: errorMessage(error) });
          }
          return;
        }
        writeJson(res, 405, { error: "method not allowed" });
      }
    }
  ];
  const logsWss = new WebSocketServer({ noServer: true });
  const terminalWss = new WebSocketServer({ noServer: true });
  const upgrades = [
    {
      path: API.terminal,
      handler: (req, socket, head) => {
        if (!isLoopbackRequest(req)) {
          socket.destroy();
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        const alias = queryParam(url, "alias");
        const cols = Number(queryParam(url, "cols") ?? "80");
        const rows = Number(queryParam(url, "rows") ?? "24");
        if (!alias) {
          socket.destroy();
          return;
        }
        terminalWss.handleUpgrade(req, socket, head, (ws) => {
          let channel;
          let closed = false;
          const shutdown = () => {
            if (closed) return;
            closed = true;
            try {
              channel?.close();
            } catch {
            }
            try {
              ws.close();
            } catch {
            }
          };
          engine.shellChannel(alias, cols, rows).then((ch) => {
            if (closed) {
              try {
                ch.close();
              } catch {
              }
              return;
            }
            channel = ch;
            const send = (text) => {
              try {
                ws.send(JSON.stringify({ type: "data", text }));
              } catch {
              }
            };
            ch.on("data", (data) => send(data.toString("utf8")));
            ch.stderr?.on("data", (data) => send(data.toString("utf8")));
            ch.on("close", () => {
              try {
                ws.send(JSON.stringify({ type: "exit" }));
              } catch {
              }
              shutdown();
            });
          }, (error) => {
            try {
              ws.send(JSON.stringify({ type: "exit", message: errorMessage(error) }));
            } catch {
            }
            shutdown();
          });
          ws.on("message", (raw) => {
            if (!channel) return;
            try {
              const frame = JSON.parse(String(raw));
              if (frame.type === "data" && typeof frame.data === "string") channel.write(frame.data);
              else if (frame.type === "resize" && frame.cols && frame.rows) {
                channel.setWindow(Math.max(Math.floor(frame.rows), 5), Math.max(Math.floor(frame.cols), 20), 0, 0);
              }
            } catch {
            }
          });
          ws.on("close", shutdown);
          ws.on("error", shutdown);
        });
      }
    },
    {
      path: API.dockerLogsFollow,
      handler: (req, socket, head) => {
        if (!isLoopbackRequest(req)) {
          socket.destroy();
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        const alias = queryParam(url, "alias");
        const id = queryParam(url, "id");
        const tail = Number(queryParam(url, "tail") ?? "200");
        if (!alias || !id) {
          socket.destroy();
          return;
        }
        logsWss.handleUpgrade(req, socket, head, (ws) => {
          let channel;
          let closed = false;
          const shutdown = () => {
            if (closed) return;
            closed = true;
            try {
              channel?.close();
            } catch {
            }
            try {
              ws.close();
            } catch {
            }
          };
          engine.dockerLogsChannel(alias, id, tail).then((ch) => {
            if (closed) {
              try {
                ch.close();
              } catch {
              }
              return;
            }
            channel = ch;
            const send = (text) => {
              try {
                ws.send(JSON.stringify({ type: "data", text }));
              } catch {
              }
            };
            ch.on("data", (data) => send(data.toString("utf8")));
            ch.stderr.on("data", (data) => send(data.toString("utf8")));
            ch.on("close", () => {
              try {
                ws.send(JSON.stringify({ type: "end" }));
              } catch {
              }
              shutdown();
            });
          }, (error) => {
            try {
              ws.send(JSON.stringify({ type: "error", message: errorMessage(error) }));
            } catch {
            }
            shutdown();
          });
          ws.on("close", shutdown);
          ws.on("error", shutdown);
        });
      }
    }
  ];
  return { routes, upgrades };
}

// src/index.ts
var name = "server-panel";
var inject = ["webServer"];
function apply(ctx) {
  const store = new HostStore();
  const engine = new ServerEngine(store);
  ctx.effect(() => () => {
    engine.dispose();
  }, "server-panel: engine");
  const { routes, upgrades } = makeRoutes({ store, engine });
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route));
    for (const upgrade of upgrades) disposers.push(ctx.webServer.registerUpgrade(upgrade));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "server-panel: routes");
  ctx.logger.info("server-panel \u5DF2\u52A0\u8F7D\uFF1A/api/dsh-server-panel/* \u8DEF\u7531\u5C31\u7EEA");
}
export {
  apply,
  inject,
  name
};
