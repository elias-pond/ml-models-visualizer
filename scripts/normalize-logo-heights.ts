// Normalize all 6 carousel logos to the SAME visible height by:
//   1. Trimming transparent padding around each logo (sharp.trim with background).
//   2. Resizing so the actual logo mark is a consistent height (60px) — wider
//      logos keep their aspect ratio.
// This makes every logo's visible mark the same size in the carousel,
// regardless of how much whitespace the source file had.
import sharp from "sharp";
import { writeFileSync, existsSync, mkdirSync, renameSync, readFileSync } from "fs";
import { join } from "path";

const DST = "/home/z/my-project/public/logos";
if (!existsSync(DST)) mkdirSync(DST, { recursive: true });

const TARGET_HEIGHT = 60; // visible logo-mark height in source px

const files = [
  "logo-1.png",
  "logo-2.png",
  "logo-3.png",
  "logo-4.png",
  "logo-5-anthropic.png",
  "logo-6-ibm.png",
];

for (const f of files) {
  const src = join(DST, f);
  let img = sharp(src);
  const meta = await img.metadata();
  if (!meta.hasAlpha) {
    // Shouldn't happen — all processed logos have alpha — but guard anyway.
    img = img.ensureAlpha();
  }
  // Trim transparent borders. sharp.trim removes rows/cols of pixels matching
  // the top-left corner's color; since the bg is fully transparent, it trims
  // transparent padding, leaving just the visible logo mark.
  const trimmed = await img.trim({ threshold: 10, background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const tm = await sharp(trimmed).metadata();
  // Resize so the (now-trimmed) mark is TARGET_HEIGHT tall, keeping aspect.
  const out = await sharp(trimmed)
    .resize({ height: TARGET_HEIGHT, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(src, out);
  const om = await sharp(out).metadata();
  console.log(`${f}: ${meta.width}x${meta.height} -> trim ${tm.width}x${tm.height} -> ${om.width}x${om.height}`);
}
console.log("done");
