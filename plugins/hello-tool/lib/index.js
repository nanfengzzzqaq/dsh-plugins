/**
 * dsh-plugin-hello-tool — DeepSeek Harness (DSH) 示例插件。
 *
 * 演示一个最小但完整的插件：
 *  - Cordis 插件入口（name / inject / config / apply）
 *  - 通过 ctx.tools.register + defineTool 注册模型可用的自定义工具
 *  - 通过 config Schema 暴露可配置项（cordis.patch.yml 的 config 块可覆盖）
 *
 * 仓库：https://github.com/nanfengzzzqaq/dsh-plugins
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { Schema } from '@deepseek-ai/schemastery'

/** Cordis 插件名，用于 Loader 诊断信息。 */
export const name = 'hello-tool'

/** 声明依赖的宿主服务：注册工具需要 tools 服务就绪。 */
export const inject = ['tools']

/** 可配置项。 */
export const config = Schema.object({
  greeting: Schema.string()
    .default('你好')
    .description('打招呼时使用的问候语'),
})

/** 插件主体：注册示例工具。ctx 注销时本插件注册的资源会自动清理。 */
export function apply(ctx) {
  ctx.tools.register(
    defineTool({
      name: 'hello_tool',
      description:
        '示例工具：向指定对象打招呼。来自 dsh-plugins 仓库的模板插件，用于验证插件链路。',
      parameters: {
        who: {
          type: 'string',
          required: false,
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
        const greeting = ctx.config.greeting ?? '你好'
        return `${greeting}, ${who}! —— 来自插件 hello-tool 的问候 ✅`
      },
    }),
  )

  ctx.logger.info('hello-tool 已加载：注册了示例工具 hello_tool')
}
