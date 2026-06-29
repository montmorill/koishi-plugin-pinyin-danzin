import type { Context } from 'koishi'
import { Schema } from 'koishi'
import {} from 'koishi-plugin-pinyin'

export const name = 'pinyin-danzin'
export const inject = ['pinyin']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.on('message', async (session) => {
    const content = session.content || ''
    const words = [{ chars: '', pinyins: [] as string[] }]
    const pinyins = await ctx.pinyin.asyncPinyin(content, { style: 3 }) as string[]
    const zipped = pinyins.map((pinyin, index) => [pinyin, content[index]])
    for (const [pinyin, char] of zipped) {
      const lastWord = words[words.length - 1]
      if (pinyin) {
        lastWord.chars += char
        lastWord.pinyins.push(pinyin)
      }
      else if (lastWord.chars) {
        words.push({ chars: '', pinyins: [] })
      }
    }
    if (!words[words.length - 1].chars)
      words.pop()

    console.log(words)
  })
}
