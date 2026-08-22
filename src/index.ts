import type { Context, Dict } from 'koishi'
import { h, Schema } from 'koishi'
import {} from 'koishi-plugin-pinyin'
import zhCN from './locales/zh-CN.yml'

export const name = 'pinyin-danzin'
export const inject = ['pinyin']

export interface Config {
  minLength: number
}

export const Config: Schema<Config> = Schema.object({
  minLength: Schema.number().min(0).step(1).default(4).description('最短连续同声调长度。'),
})

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh-CN', zhCN)

  ctx.command('danzin <text:text>').action(async ({ session }) => {
    const content = session?.elements
      ?.map(({ type, attrs }) => type === 'text' ? attrs.content : '')
      .join('')
    if (!session || !content)
      return

    const results: Dict<string[]> = { full: [], 1: [], 2: [], 3: [], 4: [] }
    const pinyins = await ctx.pinyin.asyncPinyin(content, { style: 3 }) as string[]
    const tokens = pinyins.map(pinyin => pinyin.slice(-1))
      .map((tone, index) => [tone, content[index]])

    for (const words of fixedWindow(tokens, 4)) {
      const tones = words.map(([tone]) => tone)
      if (tones.sort().join('') === '1234') {
        const chars = words.map(([, char]) => char).join('')
        if (!results.full.includes(chars))
          results.full.push(chars)
      }
    }

    let counter = 1
    let current = 'start'
    let buffer = ''
    tokens.push(['end', ''])
    for (const [tone, char] of tokens) {
      if (tone === current) {
        counter++
        buffer += char
        continue
      }
      if (current && '1234'.includes(current) && counter >= config.minLength) {
        if (!results[current].includes(buffer))
          results[current].push(buffer)
      }
      counter = 1
      current = tone
      buffer = char
    }

    return session.i18n('.result', { quote: h.quote(session.messageId), results })
  })
}

function* fixedWindow<T>(arr: T[], size: number) {
  for (let i = 0; i < arr.length - size + 1; i++) {
    yield arr.slice(i, i + size)
  }
}
