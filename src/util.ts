const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escapes text for HTML: everything from GitHub goes through it. */
export const esc = (s: string | null | undefined) => (s ?? '').replace(/[&<>"']/g, (ch) => entities[ch])

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

export function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const t = document.createElement('template')
  t.innerHTML = markup.trim()
  return t.content.firstElementChild as T
}

export interface RowCells {
  /** Left column: date or label. Plain text. */
  left?: string
  /** Middle column, as HTML (escape what goes in). */
  title: string
  /** Right column: plain text. */
  right?: string
}

/** A feed row: a link with three columns, popping in after `i` others. */
export function row(cells: RowCells, href: string, i = 0): HTMLAnchorElement {
  return html<HTMLAnchorElement>(
    `<a class="row pop" href="${esc(href)}" style="--i:${i}">` +
      `<span class="r-l">${esc(cells.left)}</span>` +
      `<span class="r-t">${cells.title}</span>` +
      `<span class="r-r">${esc(cells.right)}</span></a>`,
  )
}
