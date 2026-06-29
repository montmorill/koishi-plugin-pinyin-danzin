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
    const chars = session.content || ''
    const pinyins = await ctx.pinyin.asyncPinyin(chars, { style: 3 }) as string[]

    let counter = 1
    let current = ''
    let buffer = ''
    let puncts = ''
    const zipped = pinyins.map(pinyin => pinyin.slice(-1))
      .map((tone, index) => [tone, chars[index]])
    zipped.push(['end', '']) // fix end issue
    for (const [tone, char] of zipped) {
      if (!tone) {
        puncts += char
      }
      else if (tone === current) {
        counter++
        buffer += puncts + char
        puncts = ''
      }
      else {
        if (counter >= config.minCount) {
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
        puncts = ''
      }
    }
  })
}
