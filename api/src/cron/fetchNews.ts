import type { D1Database } from '@cloudflare/workers-types'

interface Article {
  title: string
  url: string
}

// ─── Source fetchers ───

async function fetchHackerNews(): Promise<Article[]> {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
  if (!res.ok) throw new Error(`HN API ${res.status}`)
  const ids = (await res.json()) as number[]

  const articles: Article[] = []
  for (const id of ids.slice(0, 5)) {
    try {
      const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      if (!itemRes.ok) continue
      const item = (await itemRes.json()) as { title?: string; url?: string }
      if (item.title && item.url) {
        articles.push({ title: item.title, url: item.url })
      }
    } catch {
      // skip individual item errors
    }
  }
  return articles
}

async function fetchZennTrending(): Promise<Article[]> {
  const res = await fetch('https://zenn.dev/api/articles?order=latest&count=5')
  if (!res.ok) throw new Error(`Zenn API ${res.status}`)
  const data = (await res.json()) as { articles?: { title: string; path: string }[] }
  return (data.articles ?? []).map((a) => ({
    title: a.title,
    url: `https://zenn.dev${a.path}`,
  }))
}

async function fetchHatenaIT(): Promise<Article[]> {
  const res = await fetch('https://b.hatena.ne.jp/hotentry/it.rss')
  if (!res.ok) throw new Error(`Hatena RSS ${res.status}`)
  const xml = await res.text()

  const articles: Article[] = []
  // Simple regex extraction for RSS <item> blocks
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/g
  const items = xml.match(itemRegex) ?? []
  for (const item of items.slice(0, 5)) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)
    const linkMatch = item.match(/<link>(.*?)<\/link>/)
    if (titleMatch?.[1] && linkMatch?.[1]) {
      articles.push({ title: titleMatch[1].trim(), url: linkMatch[1].trim() })
    }
  }
  return articles
}

// ─── AI summarize ───

async function summarizeWithAi(
  ai: Ai,
  article: Article
): Promise<{ summary: string; tags: string[] }> {
  try {
    const response = (await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'あなたはテック業界のアナリストです。記事タイトルとURLから日本語で2-3文の要約を作成し、関連タグを3-5個返してください。必ず以下のJSON形式のみで回答:\n{"summary":"要約文","tags":["タグ1","タグ2"]}',
        },
        {
          role: 'user',
          content: `タイトル: ${article.title}\nURL: ${article.url}`,
        },
      ],
      max_tokens: 512,
    } as Record<string, unknown>)) as Record<string, unknown>

    const text = ((response as Record<string, unknown>).response as string ?? '').trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[] }

    return {
      summary: parsed.summary ?? article.title,
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['テック', 'ニュース'],
    }
  } catch {
    return { summary: article.title, tags: ['テック', 'ニュース'] }
  }
}

// ─── Main cron ───

export async function runFetchNewsCron(db: D1Database, ai: Ai): Promise<void> {
  const sources: { name: string; fetcher: () => Promise<Article[]> }[] = [
    { name: 'HackerNews', fetcher: fetchHackerNews },
    { name: 'Zenn', fetcher: fetchZennTrending },
    { name: 'はてなブックマーク', fetcher: fetchHatenaIT },
  ]

  let totalInserted = 0

  for (const source of sources) {
    try {
      const articles = await source.fetcher()

      for (const article of articles) {
        // Dedup by source_url
        const existing = await db
          .prepare('SELECT id FROM market_notes WHERE source_url = ?')
          .bind(article.url)
          .first()
        if (existing) continue

        // Summarize with AI
        const { summary, tags } = await summarizeWithAi(ai, article)

        // Insert
        await db
          .prepare(
            `INSERT INTO market_notes (title, content, tags, source_url, created_by)
             VALUES (?, ?, ?, ?, 'system-auto')`
          )
          .bind(article.title, summary, JSON.stringify(tags), article.url)
          .run()

        totalInserted++
      }

      console.log(`[fetchNews] ${source.name}: ${articles.length}件取得`)
    } catch (err) {
      console.error(`[fetchNews] ${source.name} 失敗:`, err)
    }
  }

  console.log(`[fetchNews cron] ${totalInserted}件のニュースを保存しました`)
}
