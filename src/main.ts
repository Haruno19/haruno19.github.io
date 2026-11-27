import './style.css'
import { bannerStyles, pickStyle, renderBanner } from './banner.ts'
import { config, type Link } from './config.ts'
import rawData from './data/github.json'
import { eventKind, eventTitle, initFeed, renderFeatured } from './feed.ts'
import { mascotSVG } from './mascot.ts'
import { Terminal } from './terminal.ts'
import { applyTheme, currentTheme, themes, type Theme } from './theme.ts'
import type { GitHubData, Repo } from './types.ts'
import { esc, formatDate, html } from './util.ts'

const data = rawData as GitHubData
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

// Banner and tagline

const bannerEl = $('banner')
bannerEl.setAttribute('aria-label', config.banner)
renderBanner(bannerEl, config.banner, pickStyle())
$('sub').innerHTML = `${esc(config.tagline)} Type <span class="cmd">/help</span> below to discover other commands.`

// Sidebar: mascot, home, pinned repos, call to action

const emptyRepo: Repo = { name: '', url: '', description: null, language: null, stars: 0, fork: false, createdAt: '', pushedAt: '' }

// Picked by hand in config.ts, or as pinned on the GitHub profile.
const pinnedRepos: Repo[] = config.pinned
  ? config.pinned.map((p) => ({ ...(data.repos.find((r) => r.name === p.name) ?? emptyRepo), name: p.name, url: p.url }))
  : (data.pinned ?? [])

const mascot = $('mascot')
mascot.innerHTML = mascotSVG(60)
mascot.addEventListener('click', (e) => {
  e.preventDefault()
  mascot.classList.remove('hop')
  void mascot.offsetWidth // restart the animation
  mascot.classList.add('hop')
  goHome()
})

interface NavItem {
  key: string
  label: string
  href: string
  action?: () => void
}

function assignKeys(links: Link[], taken: Set<string>): NavItem[] {
  return links.map((link) => {
    const key = (link.key ?? [...link.name.toLowerCase()].find((ch) => /[a-z0-9]/.test(ch) && !taken.has(ch)) ?? '').toLowerCase()
    taken.add(key)
    return { key, label: link.name, href: link.url }
  })
}

const home: NavItem = { key: 'h', label: 'home', href: '#', action: goHome }
const pinnedNav = assignKeys(
  pinnedRepos.map((r) => ({ name: r.name, url: r.url, key: config.pinned?.find((p) => p.name === r.name)?.key })),
  new Set(['h']),
)
const navItems = [home, ...pinnedNav]

const navLink = (item: NavItem, i: number) => {
  const a = html<HTMLAnchorElement>(
    `<a class="nav-link pop" href="${esc(item.href)}" style="--i:${i}"><span class="k">[${esc(item.key.toUpperCase())}]</span> ${esc(item.label.toUpperCase())}</a>`,
  )
  if (item.action) a.addEventListener('click', (e) => (e.preventDefault(), item.action!()))
  return a
}

$('nav').replaceChildren(
  navLink(home, 0),
  ...(pinnedNav.length ? [html('<div class="nav-label">pinned</div>'), ...pinnedNav.map((n, i) => navLink(n, i + 1))] : []),
)
$('nav').querySelector('.nav-link')?.classList.add('on')

const cta = $<HTMLAnchorElement>('cta')
cta.href = config.cta.url
cta.textContent = config.cta.label

// Featured and feed

renderFeatured($('featured'), pinnedRepos)
const feed = initFeed($('tabs'), $('feed'), $('load'), data.events)

// Terminal

const term = new Terminal($<HTMLFormElement>('term'), $<HTMLInputElement>('input'), $('out'), $('suggest'))
$('user').textContent = config.prompt
const ghosts = ['/help', '/repos', '/contact', '/theme']
$<HTMLInputElement>('input').placeholder = ghosts[Math.floor(Math.random() * ghosts.length)]

function goHome() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const visibleRepos = () =>
  data.repos.filter((r) => config.forksInRepos || !r.fork).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))

term.add(
  {
    name: 'help',
    help: 'list every command',
    run: () =>
      term.list(
        term.commands.map((c) => ({
          cells: [`/${c.name}${c.args ? ' ' + c.args : ''}`, esc(c.help)],
          action: () => (c.args ? term.focus(`/${c.name} `) : term.run('/' + c.name)),
        })),
      ),
  },
  {
    name: 'repos',
    args: '[filter]',
    help: 'list my repositories',
    run(arg) {
      const q = arg.toLowerCase()
      const repos = visibleRepos().filter(
        (r) => !q || [r.name, r.description, r.language].some((s) => s?.toLowerCase().includes(q)),
      )
      term.list(
        repos.map((r) => ({
          cells: [r.name, r.description ? `<span class="dim">${esc(r.description)}</span>` : '', esc(repoMeta(r))],
          href: r.url,
        })),
        { numbered: true },
      )
    },
  },
  {
    name: 'releases',
    help: 'list every release',
    run: () =>
      term.list(
        data.events
          .filter((e) => e.kind === 'release')
          .map((e) => ({ cells: [formatDate(e.date), eventTitle(e), eventKind(e)], href: e.url })),
        { numbered: true },
      ),
  },
  {
    name: 'feed',
    help: 'load five more updates',
    run: () => term.say(feed.more() ? '<p class="dim">Five more, up in the feed.</p>' : '<p class="dim">That’s everything.</p>'),
  },
  {
    name: 'open',
    args: '<n>',
    help: 'open item n from the last list',
    run(arg) {
      const urls = term.listing.length ? term.listing : feed.urls()
      const n = parseInt(arg, 10)
      if (!(n >= 1 && n <= urls.length)) {
        term.say(`<p class="dim">Pick a number from 1 to ${urls.length}.</p>`)
        return
      }
      location.href = urls[n - 1]
    },
  },
  {
    name: 'contact',
    help: 'ways to reach me',
    run: () =>
      term.list(config.contacts.map((c) => ({ cells: [c.label, esc(c.value), '↗'], href: c.url }))),
  },
  {
    name: 'theme',
    args: '[name]',
    help: 'switch the color theme',
    run(arg) {
      const set = (t: Theme) => {
        applyTheme(t)
        term.print(null, `<p class="dim">Theme: <span class="cmd">${t}</span></p>`)
      }
      if (arg) {
        if (themes.includes(arg as Theme)) set(arg as Theme)
        else term.say(`<p class="dim">No theme called <span class="err">${esc(arg)}</span>. There’s ${themes.join(', ')}.</p>`)
        return
      }
      const current = currentTheme()
      term.list(
        themes.map((t) => ({
          cells: [`${t === current ? '●' : '○'} ${t}`, `<span class="dim">${t === 'auto' ? 'follows the system' : ''}</span>`],
          action: () => set(t),
        })),
        { select: themes.indexOf(current) },
      )
    },
  },
  {
    name: 'banner',
    args: '[style]',
    help: 'redraw the banner in another style',
    run(arg) {
      const style = bannerStyles.includes(arg) ? arg : pickStyle()
      renderBanner(bannerEl, config.banner, style)
      term.say(`<p class="dim">Banner: <span class="cmd">${style}</span>. Styles: ${bannerStyles.join(', ')}.</p>`)
    },
  },
  { name: 'home', help: 'back to the top', run: goHome },
  { name: 'clear', help: 'clear the scrollback', run: () => term.clear() },
)

function repoMeta(r: Repo) {
  return [r.fork ? 'fork' : '', r.language ?? '', r.stars ? `★ ${r.stars}` : ''].filter(Boolean).join(' · ')
}

// Keys: "/" opens the prompt; a nav key follows its link; arrows drive an
// open list. All only while the prompt isn't focused.

document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement
  if (target.matches('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
  if (!(e.key === 'Enter' && target.matches('a, button')) && term.handleMenuKey(e)) return
  if (e.key === '/') {
    e.preventDefault()
    term.focus('/')
    return
  }
  const item = navItems.find((n) => n.key === e.key.toLowerCase())
  if (item) {
    e.preventDefault()
    if (item.action) item.action()
    else location.href = item.href
  }
})

if (data.generatedAt) $('updated').textContent = `updated ${formatDate(data.generatedAt)}`
