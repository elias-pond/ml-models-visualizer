// Make backgrounds transparent for the carousel logos.
// - RGBA PNGs: keep as-is (already have alpha), just optimize + resize.
// - RGB PNGs: make near-white pixels transparent (threshold).
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const SRC = "/home/z/my-project/upload";
const DST = "/home/z/my-project/public/logos";
if (!existsSync(DST)) mkdirSync(DST, { recursive: true });

const files = [
  "pasted_image_1792682942847.png",
  "pasted_image_1792682952560.png",
  "pasted_image_1792682964762.png",
  "pasted_image_1792682988903.png",
];

// Threshold: pixels brighter than this on all channels become transparent.
const WHITE = 235;
const NEAR_WHITE = (r: number, g: number, b: number) => r > WHITE && g > WHITE && b > WHITE;

for (let i = 0; i < files.length; i++) {
  const src = join(SRC, files[i]);
  const out = join(DST, `logo-${i + 1}.png`);
  const img = sharp(src);
  const meta = await img.metadata();
  console.log(`logo-${i + 1}: ${meta.width}x${meta.height} channels=${meta.channels} (hasAlpha=${meta.hasAlpha})`);

  if (meta.hasAlpha) {
    await img
      .resize({ height: 80, fit: "inside", withoutEnlargement: true })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(out);
    console.log(`  -> kept alpha, resized to height 80`);
  } else {
    const { data, info } = await img
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = info.channels;
    for (let p = 0; p < data.length; p += px) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      if (NEAR_WHITE(r, g, b)) {
        data[p + 3] = 0;
      } else {
        data[p + 3] = 255;
      }
    }
    const rebuilt = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .resize({ height: 80, fit: "inside", withoutEnlargement: true })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();
    writeFileSync(out, rebuilt);
    console.log(`  -> stripped white bg, resized to height 80`);
  }
}
console.log("done");
