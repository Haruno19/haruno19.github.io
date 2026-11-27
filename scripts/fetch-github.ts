// Fetches repos, releases and pinned repos from GitHub into src/data/github.json.
// Runs before `dev` and `build` with Node's own type stripping: no packages.
//
// A token lifts the rate limit and is needed for pinned repos (GraphQL). It's
// read from GITHUB_TOKEN / GH_TOKEN (set in CI), or from the `gh` CLI locally.
// Without one, pinned repos fall back to `config.pinned`.
//
// It never fails the build: when GitHub can't be reached it keeps the last
// file, or writes an empty one.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { config } from '../src/config.ts'
import type { FeedEvent, GitHubData, Repo } from '../src/types.ts'

const out = new URL('../src/data/github.json', import.meta.url)
const api = 'https://api.github.com'

function localToken(): string {
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || localToken()
const headers: Record<string, string> = {
  accept: 'application/vnd.github+json',
  'user-agent': 'static-site-build',
}
if (token) headers.authorization = `Bearer ${token}`

async function get(path: string): Promise<any> {
  const res = await fetch(api + path, { headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`)
  return res.json()
}

function toRepo(r: any): Repo {
  return {
    name: r.name,
    url: r.html_url,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    fork: r.fork,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
  }
}

async function fetchRepos(): Promise<Repo[]> {
  const repos: Repo[] = []
  for (let page = 1; ; page++) {
    const batch: any[] = await get(`/users/${config.user}/repos?type=owner&sort=pushed&per_page=100&page=${page}`)
    repos.push(...batch.filter((r) => !r.private).map(toRepo))
    if (batch.length < 100) return repos
  }
}

async function fetchReleases(repo: Repo): Promise<FeedEvent[]> {
  const releases: any[] = await get(`/repos/${config.user}/${repo.name}/releases?per_page=100`)
  return releases
    .filter((r) => !r.draft && r.published_at)
    .map((r) => ({
      kind: 'release',
      repo: repo.name,
      tag: r.tag_name,
      title: r.name || null,
      url: r.html_url,
      date: r.published_at,
      prerelease: r.prerelease,
    }))
}

async function fetchPinned(): Promise<Repo[] | null> {
  if (!token) return null
  const query = `query($login: String!) { user(login: $login) { pinnedItems(first: 6, types: REPOSITORY) { nodes {
    ... on Repository { name url description stargazerCount isFork createdAt pushedAt primaryLanguage { name } }
  } } } }`
  const res = await fetch(api + '/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: { login: config.user } }),
  })
  const json: any = await res.json()
  if (!res.ok || json.errors) throw new Error(`pinned repos: ${JSON.stringify(json.errors ?? res.status)}`)
  return json.data.user.pinnedItems.nodes.map((r: any) => ({
    name: r.name,
    url: r.url,
    description: r.description,
    language: r.primaryLanguage?.name ?? null,
    stars: r.stargazerCount,
    fork: r.isFork,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt,
  }))
}

async function main() {
  const hidden = new Set(config.hidden.map((n) => n.toLowerCase()))
  const repos = (await fetchRepos()).filter((r) => !hidden.has(r.name.toLowerCase()))
  const own = repos.filter((r) => !r.fork)

  const releases = (await Promise.all(own.map(fetchReleases))).flat()
  const created: FeedEvent[] = own.map((r) => ({
    kind: 'repo',
    repo: r.name,
    title: r.description,
    url: r.url,
    date: r.createdAt,
  }))
  const events = [...releases, ...created].sort((a, b) => b.date.localeCompare(a.date))

  let pinned: Repo[] | null = null
  try {
    pinned = await fetchPinned()
  } catch (error) {
    console.warn(`[github] ${(error as Error).message}`)
  }

  const data: GitHubData = { generatedAt: new Date().toISOString(), repos, pinned, events }
  mkdirSync(new URL('.', out), { recursive: true })
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
  console.log(`[github] ${repos.length} repos, ${releases.length} releases, ${pinned?.length ?? 'no'} pinned${token ? '' : ' (no token)'}`)
}

main().catch((error) => {
  console.warn(`[github] couldn't fetch: ${error.message}`)
  if (existsSync(out)) {
    console.warn('[github] keeping the last src/data/github.json')
    return
  }
  const empty: GitHubData = { generatedAt: null, repos: [], pinned: null, events: [] }
  mkdirSync(new URL('.', out), { recursive: true })
  writeFileSync(out, JSON.stringify(empty, null, 2) + '\n')
})
