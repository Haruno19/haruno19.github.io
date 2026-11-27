// Everything about the site you'd want to edit lives here. The build script
// (scripts/fetch-github.ts) reads it too, so keep it free of imports.

export interface Link {
  name: string
  url: string
  /** Keyboard shortcut in the sidebar. Defaults to the first free character of the name. */
  key?: string
}

export interface Contact {
  label: string
  value: string
  url: string
}

export interface Config {
  /** GitHub login the feed, repos and pins come from. */
  user: string
  /** The big pixel title. Letters, digits and . - _ / ! and spaces. */
  banner: string
  /** Shown under the banner, before the /help hint. */
  tagline: string
  /** What the prompt says before the `>`. */
  prompt: string
  /**
   * Sidebar links. Leave undefined to use the repos pinned on your GitHub
   * profile (fetched at build time); set it to pick them by hand.
   */
  pinned?: Link[]
  /** Repos left out of the feed and /repos. */
  hidden: string[]
  /** Forks are listed in /repos, but never make the feed. */
  forksInRepos: boolean
  contacts: Contact[]
  /** The button at the bottom of the sidebar. */
  cta: { label: string; url: string }
}

export const config: Config = {
  user: 'Haruno19',
  banner: 'haru.dev',
  tagline: 'Releases, new repos and other news from my GitHub.',
  prompt: 'guest@haru.dev',
  // pinned: [
  //   { name: 'kuri', url: 'https://github.com/Haruno19/kuri' },
  //   { name: 'starfetch', url: 'https://github.com/Haruno19/starfetch' },
  // ],
  hidden: ['Haruno19', 'haruno19.github.io'],
  forksInRepos: true,
  contacts: [
    { label: 'github', value: '@Haruno19', url: 'https://github.com/Haruno19' },
    { label: 'blog', value: 'shinseiki.blog', url: 'https://shinseiki.blog' },
    { label: 'web', value: 'stefanogini.carrd.co', url: 'https://stefanogini.carrd.co' },
    // { label: 'email', value: 'you@example.com', url: 'mailto:you@example.com' },
  ],
  cta: { label: 'Follow on GitHub', url: 'https://github.com/Haruno19' },
}
