import type { Context } from 'koishi'
import { Schema } from 'koishi'
import {} from 'koishi-plugin-pinyin'

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
    b: Schema.number().default(8).description('最大连续同声调数量，大于等于该值时将必定触发。'),
  }),
})

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh-CN', {
    all: '拼音丁真：注意到「{0}」国语四声相等俱全',
    tone1: '拼音丁真：注意到「{0}」皆归一声',
    tone2: '拼音丁真：注意到「{0}」全为阳平',
    tone3: '拼音丁真：注意到「{0}」总属上母',
    tone4: '拼音丁真：注意到「{0}」俱是去调',
  })

  ctx.on('message', async (session) => {
    const chars = session.elements
      ?.map(({ type, attrs }) => type === 'text' ? attrs.content : '')
      .join('')
    if (!chars)
      return
    const pinyins = await ctx.pinyin.asyncPinyin(chars, { style: 3 }) as string[]

    const zipped = pinyins.map(pinyin => pinyin.slice(-1))
      .map((tone, index) => [tone, chars[index]])

    for (const words of fixedWindow(zipped, 4)) {
      const tones = words.map(([tone]) => tone)
      if (tones.sort().join('') === '1234') {
        const chars = words.map(([, char]) => char).join('')
        await session.send(session.text('all', [chars]))
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
        await session.send(session.text(`.tone${tone}`, [buffer]))
      }
      counter = 1
      current = tone
      buffer = char
    }
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
