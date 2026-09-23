// Renders the downloaded Quick, Draw! strokes with shared/sketch/bitmap.ts into flat uint8 files
// for training: data/quickdraw/{train,eval}.{x,y}.bin and classes.json.
import { readFile, writeFile } from 'node:fs/promises'
import { SIZE, strokesToBitmap } from '../../shared/sketch/bitmap'
import { QD_CATEGORIES } from './categories.mts'

const classes = Object.keys(QD_CATEGORIES)
await writeFile('data/quickdraw/classes.json', JSON.stringify(classes))
for (const split of ['train', 'eval']) {
  const xs: Uint8Array[] = [], ys: number[] = []
  for (const [label, key] of classes.entries()) {
    const lines = (await readFile(`data/quickdraw/${key}.${split}.ndjson`, 'utf8')).trim().split('\n')
    for (const l of lines) {
      const bmp = strokesToBitmap(JSON.parse(l))
      xs.push(Uint8Array.from(bmp, v => Math.round(v * 255))); ys.push(label)
    }
  }
  const x = new Uint8Array(xs.length * SIZE * SIZE)
  xs.forEach((b, i) => x.set(b, i * SIZE * SIZE))
  await writeFile(`data/quickdraw/${split}.x.bin`, x)
  await writeFile(`data/quickdraw/${split}.y.bin`, Uint8Array.from(ys))
  console.log(split, xs.length, 'images')
}
