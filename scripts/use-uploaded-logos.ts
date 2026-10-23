// Make the two newly uploaded logos transparent-backgrounded and place them
// into /public/logos/ as logo-5-anthropic.png and logo-6-ibm.png.
//
// Order: resize the RGB source FIRST (preserving crisp colors), then strip the
// light background to transparent. Stripping before resize would let the
// resize resample alpha and create muddy semi-transparent edges.
import sharp from "sharp";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const SRC = "/home/z/my-project/upload";
const DST = "/home/z/my-project/public/logos";
if (!existsSync(DST)) mkdirSync(DST, { recursive: true });

const BG = 200;

function stripLightBg(data: Buffer, channels: number) {
  for (let p = 0; p < data.length; p += channels) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (r > BG && g > BG && b > BG) {
      data[p + 3] = 0; // transparent background
    } else {
      data[p + 3] = 255; // logo — keep fully opaque
    }
  }
}

const jobs = [
  {
    src: "pasted_image_1792693200262.png", // IBM — blue stripes on white
    out: "logo-6-ibm.png",
    height: 56,
  },
  {
    src: "pasted_image_1792693224667.png", // Anthropic — black "A·I" on light grey
    out: "logo-5-anthropic.png",
    height: 72,
  },
];

for (const j of jobs) {
  // 1. Resize the RGB source to the target height (clean color, no alpha yet).
  const resized = await sharp(join(SRC, j.src))
    .resize({ height: j.height, fit: "inside", withoutEnlargement: true })
    .toBuffer();
  // 2. Add an alpha channel, then strip the light background.
  const { data, info } = await sharp(resized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  stripLightBg(data, info.channels);
  // 3. Re-encode as PNG.
  const out = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(DST, j.out), out);
  const m = await sharp(out).metadata();
  console.log(`${j.out}: ${m.width}x${m.height} hasAlpha=${m.hasAlpha}`);
}
console.log("done");
