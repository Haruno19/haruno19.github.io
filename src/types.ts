// The shape of src/data/github.json, written by scripts/fetch-github.ts.

export interface Repo {
  name: string
  url: string
  description: string | null
  language: string | null
  stars: number
  fork: boolean
  createdAt: string
  pushedAt: string
}

export interface FeedEvent {
  kind: 'release' | 'repo'
  repo: string
  /** Release tag, for releases. */
  tag?: string
  /** Release name, or the repo's description for new repos. */
  title: string | null
  url: string
  date: string
  prerelease?: boolean
}

export interface GitHubData {
  generatedAt: string | null
  repos: Repo[]
  /** Pinned on the profile, in order; null when they couldn't be fetched. */
  pinned: Repo[] | null
  events: FeedEvent[]
}
