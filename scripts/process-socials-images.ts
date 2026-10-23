// Process the LinkedIn logo (strip light bg → transparent) and the headshot
// (copy as-is, optimized). Both into /public/.
import sharp from "sharp";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const SRC = "/home/z/my-project/upload";
const PUB = "/home/z/my-project/public";
if (!existsSync(PUB)) mkdirSync(PUB, { recursive: true });

const BG = 200;

function stripLightBg(data: Buffer, channels: number) {
  for (let p = 0; p < data.length; p += channels) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (r > BG && g > BG && b > BG) {
      data[p + 3] = 0; // transparent background
    } else {
      data[p + 3] = 255; // logo — keep opaque
    }
  }
}

// LinkedIn logo — resize first (RGB, no alpha), then strip light bg.
{
  const resized = await sharp(join(SRC, "pasted_image_1792714437030.png"))
    .resize({ height: 64, fit: "inside", withoutEnlargement: true })
    .toBuffer();
  const { data, info } = await sharp(resized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  stripLightBg(data, info.channels);
  const out = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUB, "linkedin.png"), out);
  const m = await sharp(out).metadata();
  console.log(`linkedin.png: ${m.width}x${m.height} hasAlpha=${m.hasAlpha}`);
}

// Headshot — optimize (resize to a reasonable display size, keep alpha).
{
  const out = await sharp(join(SRC, "pasted_image_1792714764020.png"))
    .resize({ width: 480, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUB, "headshot.png"), out);
  const m = await sharp(out).metadata();
  console.log(`headshot.png: ${m.width}x${m.height} hasAlpha=${m.hasAlpha}`);
}
console.log("done");
