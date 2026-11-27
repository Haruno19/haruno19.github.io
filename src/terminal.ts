// The prompt at the bottom: commands, their output, suggestions while typing,
// history, and pickable lists (arrow keys, enter, esc).

import { esc, html } from './util.ts'

export interface Command {
  name: string
  /** Shown after the name in /help, e.g. "<n>". */
  args?: string
  help: string
  run(arg: string): void
}

export interface MenuItem {
  /** Up to three cells; the first is plain text, the rest HTML. */
  cells: [string, string?, string?]
  /** Followed on enter or click. */
  href?: string
  action?: () => void
}

interface Menu {
  el: HTMLElement
  rows: HTMLElement[]
  items: MenuItem[]
  index: number
}

const hint = '↑↓ to choose · enter to run · esc to dismiss'

export class Terminal {
  readonly commands: Command[] = []
  /** URLs from the last list printed, for /open. */
  listing: string[] = []

  private menu: Menu | null = null
  private suggestions: { list: Command[]; index: number } | null = null
  private history: string[] = []
  private historyIndex = 0

  private input: HTMLInputElement
  private out: HTMLElement
  private suggestEl: HTMLElement

  constructor(form: HTMLFormElement, input: HTMLInputElement, out: HTMLElement, suggestEl: HTMLElement) {
    this.input = input
    this.out = out
    this.suggestEl = suggestEl
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.submit()
    })
    input.addEventListener('input', () => this.updateSuggestions())
    input.addEventListener('keydown', (e) => this.keydown(e))
    input.addEventListener('blur', () => setTimeout(() => this.closeSuggestions(), 120))
    form.addEventListener('click', () => input.focus())
  }

  add(...commands: Command[]) {
    this.commands.push(...commands)
  }

  focus(text?: string) {
    if (text !== undefined) {
      this.input.value = text
      this.updateSuggestions()
    }
    this.input.focus()
    this.input.setSelectionRange(this.input.value.length, this.input.value.length)
  }

  /** Runs a line as if typed. */
  run(line: string) {
    line = line.trim()
    if (!line) return
    this.history.push(line)
    this.historyIndex = this.history.length
    this.closeSuggestions()
    this.input.value = ''

    if (!line.startsWith('/')) {
      this.print(line, `<p class="dim">Commands start with a slash. Try <span class="cmd">/help</span>.</p>`)
      return
    }
    const [name, ...rest] = line.slice(1).split(/\s+/)
    const command = this.commands.find((c) => c.name === name.toLowerCase())
    if (!command) {
      this.print(line, `<p class="dim">command not found: <span class="err">/${esc(name)}</span>. Try <span class="cmd">/help</span>.</p>`)
      return
    }
    this.echo = line
    command.run(rest.join(' '))
  }

  /** The line being run, for commands that print. */
  private echo = ''

  /** Prints a block of output under an echo of the command. */
  print(echo: string | null, body: string | HTMLElement): HTMLElement {
    this.dismissMenu()
    const block = html(`<div class="t-block pop">${echo === null ? '' : `<div class="t-echo"><span class="gt">&gt;</span> ${esc(echo)}</div>`}</div>`)
    const content = typeof body === 'string' ? html(`<div class="t-body">${body}</div>`) : body
    block.append(content)
    this.out.append(block)
    this.scrollDown()
    return block
  }

  /** Prints output for the command being run. */
  say(body: string | HTMLElement) {
    return this.print(this.echo, body)
  }

  /** Prints a pickable list for the command being run. */
  list(items: MenuItem[], options: { numbered?: boolean; select?: number } = {}) {
    if (items.length === 0) {
      this.say('<p class="dim">Nothing to show.</p>')
      return
    }
    const el = html(`<div class="menu${options.numbered ? ' numbered' : ''}"></div>`)
    const rows = items.map((item, i) => {
      const tag = item.href ? 'a' : 'div'
      const r = html(
        `<${tag} class="m-row"${item.href ? ` href="${esc(item.href)}"` : ''}>` +
          (options.numbered ? `<span class="m-n">${i + 1}</span>` : '') +
          `<span class="m-a">${esc(item.cells[0])}</span><span class="m-b">${item.cells[1] ?? ''}</span><span class="m-c">${item.cells[2] ?? ''}</span></${tag}>`,
      )
      r.addEventListener('mouseenter', () => this.menu?.el === el && this.choose(i))
      r.addEventListener('click', (e) => {
        if (item.action) {
          e.preventDefault()
          item.action()
        }
      })
      return r
    })
    el.append(...rows, html(`<div class="m-hint">${hint}</div>`))
    this.listing = items.flatMap((item) => (item.href ? [item.href] : []))
    this.print(this.echo, el)
    this.menu = { el, rows, items, index: -1 }
    this.choose(options.select ?? 0)
  }

  clear() {
    this.menu = null
    this.out.replaceChildren()
  }

  private choose(i: number) {
    if (!this.menu) return
    const { rows } = this.menu
    this.menu.index = (i + rows.length) % rows.length
    rows.forEach((r, j) => r.classList.toggle('sel', j === this.menu!.index))
    rows[this.menu.index].scrollIntoView({ block: 'nearest' })
  }

  private activate() {
    if (!this.menu) return
    const item = this.menu.items[this.menu.index]
    this.dismissMenu()
    if (item.action) item.action()
    else if (item.href) location.href = item.href
  }

  private dismissMenu() {
    if (!this.menu) return
    this.menu.el.classList.add('done')
    this.menu.rows.forEach((r) => r.classList.remove('sel'))
    this.menu = null
  }

  /** Lets the page's own keys reach an open list while the prompt isn't focused. */
  handleMenuKey(e: KeyboardEvent): boolean {
    if (!this.menu) return false
    if (e.key === 'ArrowDown') this.choose(this.menu.index + 1)
    else if (e.key === 'ArrowUp') this.choose(this.menu.index - 1)
    else if (e.key === 'Enter') this.activate()
    else if (e.key === 'Escape') this.dismissMenu()
    else return false
    e.preventDefault()
    return true
  }

  private submit() {
    const value = this.input.value.trim()
    const s = this.suggestions
    if (s && !value.includes(' ') && !this.commands.some((c) => '/' + c.name === value)) {
      this.pick(s.list[s.index], true)
      return
    }
    if (!value && this.menu) {
      this.activate()
      return
    }
    this.run(value)
  }

  /** Completes a suggestion, running it when it needs nothing more. */
  private pick(command: Command, run: boolean) {
    if (run && !command.args) this.run('/' + command.name)
    else this.focus(`/${command.name} `)
  }

  private keydown(e: KeyboardEvent) {
    const s = this.suggestions
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const step = e.key === 'ArrowDown' ? 1 : -1
      if (s) {
        s.index = (s.index + step + s.list.length) % s.list.length
        this.renderSuggestions()
      } else if (this.menu && !this.input.value) {
        this.choose(this.menu.index + step)
      } else {
        this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + step))
        this.input.value = this.history[this.historyIndex] ?? ''
      }
      e.preventDefault()
    } else if (e.key === 'Tab' && s) {
      this.pick(s.list[s.index], false)
      e.preventDefault()
    } else if (e.key === 'Escape') {
      if (s) this.closeSuggestions()
      else if (this.menu) this.dismissMenu()
      else this.input.blur()
      e.preventDefault()
    }
  }

  private updateSuggestions() {
    const value = this.input.value
    if (!value.startsWith('/') || value.includes(' ')) return this.closeSuggestions()
    const typed = value.slice(1).toLowerCase()
    const list = this.commands.filter((c) => c.name.startsWith(typed))
    if (list.length === 0 || (list.length === 1 && list[0].name === typed && !list[0].args)) return this.closeSuggestions()
    this.suggestions = { list, index: 0 }
    this.renderSuggestions()
  }

  private renderSuggestions() {
    const s = this.suggestions
    if (!s) return
    this.suggestEl.replaceChildren(
      ...s.list.map((c, i) => {
        const el = html(
          `<div class="m-row${i === s.index ? ' sel' : ''}"><span class="m-a">/${c.name}${c.args ? ` <span class="dim">${esc(c.args)}</span>` : ''}</span><span class="m-b">${esc(c.help)}</span></div>`,
        )
        el.addEventListener('mousedown', (e) => {
          e.preventDefault()
          this.pick(c, true)
        })
        return el
      }),
    )
    this.suggestEl.hidden = false
  }

  private closeSuggestions() {
    this.suggestions = null
    this.suggestEl.hidden = true
    this.suggestEl.replaceChildren()
  }

  private scrollDown() {
    // The prompt is sticky, so it always counts as in view: scroll the page.
    requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }))
  }
}
