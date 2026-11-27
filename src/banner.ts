// The pixel title: a small bitmap font, drawn as SVG in one of several
// styles. A new style is picked on every load (never the same twice running).

// Nine rows a glyph: 0–1 ascenders, 2–6 x-height (baseline at 6), 7–8
// descenders. Rows left out at the end are empty.
const font: Record<string, string[]> = {
  a: ['', '', '.###.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['', '', '.####', '#....', '#....', '#....', '.####'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['', '', '.###.', '#...#', '#####', '#....', '.####'],
  f: ['..##', '.#..', '####', '.#..', '.#..', '.#..', '.#..'],
  g: ['', '', '.####', '#...#', '#...#', '#...#', '.####', '....#', '####.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['#', '.', '#', '#', '#', '#', '#'],
  j: ['..#', '...', '..#', '..#', '..#', '..#', '..#', '..#', '##.'],
  k: ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
  l: ['#.', '#.', '#.', '#.', '#.', '#.', '.#'],
  m: ['', '', '####.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['', '', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['', '', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['', '', '####.', '#...#', '#...#', '#...#', '####.', '#....', '#....'],
  q: ['', '', '.####', '#...#', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['', '', '#.##', '##..', '#...', '#...', '#...'],
  s: ['', '', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#..', '.#..', '####', '.#..', '.#..', '.#..', '..##'],
  u: ['', '', '#...#', '#...#', '#...#', '#...#', '.####'],
  v: ['', '', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['', '', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['', '', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['', '', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '####.'],
  z: ['', '', '#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  '-': ['...', '...', '...', '...', '###'],
  _: ['....', '....', '....', '....', '....', '....', '####'],
  '/': ['..#', '..#', '.#.', '.#.', '.#.', '#..', '#..'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  ' ': ['..'],
}

interface Bitmap {
  cols: number
  rows: number
  on: (x: number, y: number) => boolean
  pixels: [number, number][]
}

function rasterize(text: string): Bitmap {
  const pixels: [number, number][] = []
  let x = 0
  let rows = 7
  for (const char of text.toLowerCase()) {
    const glyph = font[char] ?? font[' ']
    const width = Math.max(...glyph.map((row) => row.length))
    glyph.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') pixels.push([x + i, y])
    })
    rows = Math.max(rows, glyph.length)
    x += width + 1
  }
  const set = new Set(pixels.map(([px, py]) => `${px},${py}`))
  return { cols: x - 1, rows, on: (px, py) => set.has(`${px},${py}`), pixels }
}

const r = (x: number, y: number, w: number, h: number, cls: string) =>
  `<rect x="${+x.toFixed(3)}" y="${+y.toFixed(3)}" width="${+w.toFixed(3)}" height="${+h.toFixed(3)}" class="${cls}"/>`
const c = (x: number, y: number, radius: number, cls: string) =>
  `<circle cx="${+x.toFixed(3)}" cy="${+y.toFixed(3)}" r="${radius}" class="${cls}"/>`

/** A checkerboard, in quarter pixels: the dithered shadow. */
function dither(x: number, y: number, cls: string) {
  let s = ''
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) s += r(x + i / 4, y + j / 4, 0.25, 0.25, cls)
  return s
}

/** Pixels one step down and right, where the glyph itself isn't. */
function shadowOf(b: Bitmap, draw: (x: number, y: number) => string) {
  return b.pixels.filter(([x, y]) => !b.on(x + 1, y + 1)).map(([x, y]) => draw(x + 1, y + 1)).join('')
}

const bayer = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/** Each style draws the bitmap with the classes b-ink, b-soft, b-faint, b-accent. */
const styles: Record<string, (b: Bitmap) => string> = {
  blocks: (b) => shadowOf(b, (x, y) => dither(x, y, 'b-faint')) + b.pixels.map(([x, y]) => r(x, y, 1, 1, 'b-ink')).join(''),

  dashes: (b) =>
    shadowOf(b, (x, y) => dither(x, y, 'b-faint')) + b.pixels.map(([x, y]) => r(x, y, 1, 0.55, 'b-ink')).join(''),

  dots: (b) => b.pixels.map(([x, y]) => c(x + 0.5, y + 0.5, 0.42, 'b-ink')).join(''),

  braille: (b) =>
    b.pixels
      .map(([x, y]) => [0.27, 0.73].flatMap((dx) => [0.27, 0.73].map((dy) => c(x + dx, y + dy, 0.17, 'b-ink'))).join(''))
      .join(''),

  extrude: (b) =>
    [0.6, 0.4, 0.2].map((d) => b.pixels.map(([x, y]) => r(x + d, y + d, 1, 1, 'b-accent')).join('')).join('') +
    b.pixels.map(([x, y]) => r(x, y, 1, 1, 'b-ink')).join(''),

  shade: (b) =>
    b.pixels
      .map(([x, y]) => {
        const density = 0.3 + (0.7 * y) / Math.max(1, b.rows - 3)
        let s = ''
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) if (bayer[j][i] / 16 < density) s += r(x + i / 4, y + j / 4, 0.25, 0.25, 'b-ink')
        return s
      })
      .join(''),

  scanlines: (b) =>
    b.pixels.map(([x, y]) => [0, 1, 2].map((i) => r(x, y + i / 3, 1, 0.2, 'b-accent')).join('')).join(''),

  outline: (b) =>
    b.pixels
      .map(([x, y]) => {
        // Only the edges of each stroke, a quarter pixel thick.
        const t = 0.25
        let s = ''
        if (!b.on(x, y - 1)) s += r(x, y, 1, t, 'b-ink')
        if (!b.on(x, y + 1)) s += r(x, y + 1 - t, 1, t, 'b-ink')
        if (!b.on(x - 1, y)) s += r(x, y, t, 1, 'b-ink')
        if (!b.on(x + 1, y)) s += r(x + 1 - t, y, t, 1, 'b-ink')
        return s
      })
      .join(''),
}

export const bannerStyles = Object.keys(styles)

const storageKey = 'banner-style'

/** A style other than the last one shown. */
export function pickStyle(): string {
  const last = localStorage.getItem(storageKey)
  const choices = bannerStyles.filter((s) => s !== last)
  const style = choices[Math.floor(Math.random() * choices.length)]
  localStorage.setItem(storageKey, style)
  return style
}

/** Pixel size, in CSS pixels, at full width. */
const pixel = 12

export function renderBanner(el: HTMLElement, text: string, style: string) {
  const b = rasterize(text)
  // One pixel of room for shadows and extrusion.
  const w = b.cols + 1
  const h = b.rows + 1
  el.dataset.style = style
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w * pixel}" height="${h * pixel}" shape-rendering="${
    style === 'dots' || style === 'braille' ? 'geometricPrecision' : 'crispEdges'
  }" aria-hidden="true">${styles[style](b)}</svg>`
}
