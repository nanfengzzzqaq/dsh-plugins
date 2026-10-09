/**
 * dsh-plugin-hello-tool — DeepSeek Harness (DSH) 示例插件。
 *
 * 演示一个最小但完整的插件：
 *  - Cordis 插件入口（name / inject / Config / apply）
 *  - 通过 ctx.tools.register + defineTool 注册模型可用的自定义工具
 *  - 通过 Config Schema 暴露可配置项（cordis.patch.yml 的 config 块可覆盖）
 *
 * 仓库：https://github.com/nanfengzzzqaq/dsh-plugins
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
// 注意：@deepseek-ai/schemastery 的 ESM 入口只有 default 导出（Schema 类本身），
// 这里必须用 default import，不能用 `import { Schema }`（ESM 命名导入会失败）。
import Schema from '@deepseek-ai/schemastery'

/** Cordis 插件名，用于 Loader 诊断信息。 */
export const name = 'hello-tool'

/** 声明依赖的宿主服务：注册工具需要 tools 服务就绪。 */
export const inject = ['tools']

/**
 * 可配置项。Cordis 读取的是大写的 `Config` 导出（`runtime.Config`），
 * 小写 `config` 会被静默忽略（不校验、不填默认值）。
 */
export const Config = Schema.object({
  greeting: Schema.string()
    .default('你好')
    .description('打招呼时使用的问候语'),
})

/**
 * 插件主体：注册示例工具。ctx 注销时本插件注册的资源会自动清理。
 * 配置通过 apply 的第二个参数传入（已按 Config 校验并填好默认值）——
 * Cordis v4 没有 `ctx.config`，访问它会抛 `cannot get property "config" without inject`。
 */
export function apply(ctx, config) {
  ctx.tools.register(
    defineTool({
      name: 'hello_tool',
      description:
        '示例工具：向指定对象打招呼。来自 dsh-plugins 仓库的模板插件，用于验证插件链路。',
      parameters: {
        // DSL 规则：required 只能写 true；可选参数直接省略该键
        // （写 required: false 会在 defineTool 时抛 JsonSchemaError）。
        who: {
          type: 'string',
          description: '要打招呼的对象，默认 DSH',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        // args 已通过 schema 验证；exec.signal 为协作式取消信号，
        // 长耗时工具应适时检查它（本工具瞬间完成，仅作演示）。
        void exec
        const who = args.who?.trim() || 'DSH'
        const greeting = config.greeting ?? '你好'
        return `${greeting}, ${who}! —— 来自插件 hello-tool 的问候 ✅`
      },
    }),
  )

  ctx.logger.info(`hello-tool 已加载：注册了示例工具 hello_tool（greeting=${JSON.stringify(config.greeting)}）`)
}
