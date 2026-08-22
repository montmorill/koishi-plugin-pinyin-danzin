import type { Context, Dict } from 'koishi'
import { h, Schema } from 'koishi'
import {} from 'koishi-plugin-pinyin'
import zhCN from './locales/zh-CN.yml'

export const name = 'pinyin-danzin'
export const inject = ['pinyin']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.i18n.define('zh-CN', zhCN)

  ctx.on('message', async (session) => {
    const chars = session.elements
      ?.map(({ type, attrs }) => type === 'text' ? attrs.content : '')
      .join('')
    if (!chars)
      return
    const results: Dict<string[]> = { full: [], 1: [], 2: [], 3: [], 4: [] }
    const pinyins = await ctx.pinyin.asyncPinyin(chars, { style: 3 }) as string[]
    const zipped = pinyins.map(pinyin => pinyin.slice(-1))
      .map((tone, index) => [tone, chars[index]])

    for (const words of fixedWindow(zipped, 4)) {
      const tones = words.map(([tone]) => tone)
      if (tones.sort().join('') === '1234') {
        const chars = words.map(([, char]) => char).join('')
        if (!results.full.includes(chars))
          results.full.push(chars)
      }
    }

    let current = 'start'
    let buffer = ''
    zipped.push(['end', ''])
    for (const [tone, char] of zipped) {
      if (tone === current) {
        buffer += char
        continue
      }
      if (current && '1234'.includes(current)) {
        if (!results[current].includes(buffer))
          results[current].push(buffer)
      }
      current = tone
      buffer = char
    }

    await session.send(await session.withScope('commands.danzin.messages', () => [
      h.quote(session.messageId),
      ...Object.entries(results)
        .filter(([, words]) => words.length)
        .flatMap(([tone, words]) => session.i18n('.line', { tone, words })),
    ]),
    )
  })
}

function* fixedWindow<T>(arr: T[], size: number) {
  for (let i = 0; i < arr.length - size + 1; i++) {
    yield arr.slice(i, i + size)
  }
}
