// Renders the PWA PNG icons from public/icons/icon.svg (run via `make icons`).
import { readFile, writeFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'

const svg = await readFile('public/icons/icon.svg')
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  await writeFile(`public/icons/${name}`, png)
  console.log(`public/icons/${name}`)
}
