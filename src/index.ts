import type { Context } from 'koishi'
import { Schema } from 'koishi'
import {} from 'koishi-plugin-pinyin'

export const name = 'pinyin-danzin'
export const inject = ['pinyin']

export interface Config {
  minCount: number
}

export const Config: Schema<Config> = Schema.object({
  minCount: Schema.number().default(3).description('最小连续同声调数量。'),
})

export function apply(ctx: Context, config: Config) {
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
        await session.send(`拼音丁真：注意到「${chars}」国语四声相等俱全。`)
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
      if (current && '1234'.includes(current) && counter >= config.minCount) {
        await session.send(`拼音丁真：注意到「${buffer}」${{
          1: '皆归一声',
          2: '全为阳平',
          3: '总属上母',
          4: '俱是去调',
        }[current]}。`)
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
