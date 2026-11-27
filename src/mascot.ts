// Kuri's pixel burr (from kuri's CLI header, CLI/Terminal.swift): a chestnut
// burr split open, the nut rising out of it. One letter a pixel, `.` for none.
const hero = [
  '.....hN.....',
  '...ghNNng...',
  '..GNNNNNng..',
  '.GGnNNNNngg.',
  '..GGccccgg..',
  '.GGGGGggggg.',
  '..GGGggggg..',
  '.G.GGgggg.g.',
  '....G..g....',
]

const colours: Record<string, string> = {
  G: '#A4AE58', // burr, light
  g: '#7E8A3C', // burr, dark
  N: '#B0703F', // nut
  n: '#8A4F2A', // nut, in shadow
  h: '#D9A06F', // nut, lit
  c: '#E6D3A3', // the nut's pale base
}

export function mascotSVG(size: number): string {
  const w = hero[0].length
  const h = hero.length
  let rects = ''
  hero.forEach((row, y) =>
    [...row].forEach((p, x) => {
      if (colours[p]) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${colours[p]}"/>`
    }),
  )
  return `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${(size * h) / w}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`
}
