import type { FeedEvent, Repo } from './types.ts'
import { esc, formatDate, html, row } from './util.ts'

const pageSize = 5

export function eventTitle(e: FeedEvent): string {
  if (e.kind === 'release') {
    // Skip the release name when it only repeats the tag ("Kuri 0.2.2").
    const named = e.title && e.title !== e.tag && !e.title.endsWith(e.tag ?? '')
    return `<b>${esc(e.repo)}</b> <span class="tag">${esc(e.tag)}</span>${named ? ` <span class="dim">${esc(e.title)}</span>` : ''}`
  }
  return `<b>${esc(e.repo)}</b>${e.title ? ` <span class="dim">${esc(e.title)}</span>` : ''}`
}

export function eventKind(e: FeedEvent): string {
  if (e.kind === 'repo') return 'new repo'
  return e.prerelease ? 'pre-release' : 'release'
}

export const repoTitle = (r: Repo) => `<b>${esc(r.name)}</b>${r.description ? ` <span class="dim">${esc(r.description)}</span>` : ''}`

export function renderFeatured(el: HTMLElement, pinned: Repo[]) {
  el.replaceChildren(
    ...pinned.map((r, i) => row({ left: i === 0 ? 'Pinned' : '', title: repoTitle(r), right: `★ ${r.stars}` }, r.url, i)),
  )
  el.hidden = pinned.length === 0
}

const tabs = [
  { label: 'ALL', match: (_: FeedEvent) => true },
  { label: 'RELEASES', match: (e: FeedEvent) => e.kind === 'release' },
  { label: 'NEW REPOS', match: (e: FeedEvent) => e.kind === 'repo' },
]

export interface Feed {
  /** Shows the next page; false when there was nothing more. */
  more(): boolean
  /** The URLs of the rows on screen, in order. */
  urls(): string[]
}

export function initFeed(tabsEl: HTMLElement, listEl: HTMLElement, loadEl: HTMLElement, events: FeedEvent[]): Feed {
  let tab = 0
  let shown = 0
  let list = events

  const loadButton = loadEl.querySelector<HTMLButtonElement>('.lm')!

  function show(count: number) {
    const from = shown
    shown = Math.min(count, list.length)
    for (let i = from; i < shown; i++) {
      const e = list[i]
      listEl.append(row({ left: formatDate(e.date), title: eventTitle(e), right: eventKind(e) }, e.url, i - from))
    }
    loadButton.hidden = shown >= list.length
    if (list.length === 0) listEl.replaceChildren(html('<p class="empty">Nothing here yet.</p>'))
  }

  function select(i: number) {
    tab = i
    tabsEl.querySelectorAll('.tab').forEach((t, j) => t.classList.toggle('on', j === i))
    list = events.filter(tabs[i].match)
    shown = 0
    listEl.replaceChildren()
    show(pageSize)
  }

  tabsEl.replaceChildren(
    ...tabs.map((t, i) => {
      const b = html<HTMLButtonElement>(`<button class="tab" type="button">${t.label}</button>`)
      b.onclick = () => select(i)
      return b
    }),
  )
  loadButton.onclick = () => show(shown + pageSize)
  select(tab)

  return {
    more() {
      if (shown >= list.length) return false
      show(shown + pageSize)
      return true
    },
    urls: () => list.slice(0, shown).map((e) => e.url),
  }
}
