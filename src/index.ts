import type { Context, Dict } from 'koishi'
import { Schema } from 'koishi'
import {} from 'koishi-plugin-pinyin'
import zhCN from '../locales/zh-CN.yml'

export const name = 'pinyin-danzin'
export const inject = ['pinyin']
export { usage } from './usage'

export interface Config {
  lerp: {
    a: number
    b: number
  }
}

export const Config: Schema<Config> = Schema.object({
  lerp: Schema.object({
    a: Schema.number().default(3).description('最小连续同声调数量，小于等于该值时将不会触发。'),
    b: Schema.number().default(4).description('最大连续同声调数量，大于等于该值时将必定触发。'),
  }),
})

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh-CN', zhCN)

  ctx.on('message', async (session) => {
    const chars = session.elements
      ?.map(({ type, attrs }) => type === 'text' ? attrs.content : '')
      .join('')
    if (!chars)
      return
    const results: Dict<string[]> = { all: [], 1: [], 2: [], 3: [], 4: [] }
    const pinyins = await ctx.pinyin.asyncPinyin(chars, { style: 3 }) as string[]
    const zipped = pinyins.map(pinyin => pinyin.slice(-1))
      .map((tone, index) => [tone, chars[index]])

    for (const words of fixedWindow(zipped, 4)) {
      const tones = words.map(([tone]) => tone)
      if (tones.sort().join('') === '1234') {
        const chars = words.map(([, char]) => char).join('')
        if (!results.all.includes(chars))
          results.all.push(chars)
      }
    }

    let counter = 1
    let current = 'start'
    let buffer = ''
    zipped.push(['end', ''])
    for (const [tone, char] of zipped) {
      if (tone === current) {
        counter++
        buffer += char
        continue
      }
      const probability = inverseLerp(config.lerp.a, config.lerp.b, counter)
      if (current && '1234'.includes(current) && Math.random() < probability) {
        if (!results[current].includes(buffer))
          results[current].push(buffer)
      }
      counter = 1
      current = tone
      buffer = char
    }

    await session.send(Object.entries(results)
      .filter(([, words]) => words.length !== 0)
      .map(([tone, words]) => session.text('line', { words, tone }))
      .join('\n'))
  })
}

function* fixedWindow<T>(arr: T[], size: number) {
  for (let i = 0; i < arr.length - size + 1; i++) {
    yield arr.slice(i, i + size)
  }
}

function inverseLerp(a: number, b: number, t: number) {
  return (t - a) / (b - a)
}
