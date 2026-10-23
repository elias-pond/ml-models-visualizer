// Generate Anthropic + IBM logo PNGs with transparent backgrounds, sized to
// match the existing carousel logos (height ~80px). Both rendered as crisp
// SVG -> PNG so they scale cleanly.
import sharp from "sharp";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DST = "/home/z/my-project/public/logos";
if (!existsSync(DST)) mkdirSync(DST, { recursive: true });

// Anthropic wordmark — the lowercase "anthropic" in its signature clay/charcoal.
// The real mark uses a warm-clay tone (#CC5500-ish) but the simple, recognizable
// form is the lowercase wordmark. We render it in dark charcoal so it reads on
// the white hero.
const anthropicSvg = `
<svg width="320" height="80" xmlns="http://www.w3.org/2000/svg">
  <text x="160" y="52" text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="44" font-weight="700" letter-spacing="2"
    fill="#2D2A26">anthropic</text>
</svg>`;

// IBM "8-bar" logo — the classic stripes logo rendered as horizontal bars
// forming the letters I B M. We approximate the iconic look with three groups
// of 8 horizontal dark bars.
const ibmSvg = `
<svg width="220" height="80" xmlns="http://www.w3.org/2000/svg">
  <g fill="#1F2937">
    <!-- IBM stripes: 8 bars per letter, letters I B M -->
    <!-- I -->
    <rect x="20" y="14" width="40" height="6"/>
    <rect x="20" y="26" width="40" height="6"/>
    <rect x="20" y="38" width="40" height="6"/>
    <rect x="20" y="50" width="40" height="6"/>
    <rect x="20" y="62" width="40" height="6"/>
    <!-- B -->
    <rect x="72" y="14" width="40" height="6"/>
    <rect x="72" y="26" width="40" height="6"/>
    <rect x="72" y="38" width="40" height="6"/>
    <rect x="72" y="50" width="40" height="6"/>
    <rect x="72" y="62" width="40" height="6"/>
    <rect x="100" y="20" width="12" height="6"/>
    <rect x="100" y="32" width="12" height="6"/>
    <rect x="100" y="44" width="12" height="6"/>
    <rect x="100" y="56" width="12" height="6"/>
    <!-- M -->
    <rect x="124" y="14" width="40" height="6"/>
    <rect x="124" y="26" width="40" height="6"/>
    <rect x="124" y="38" width="40" height="6"/>
    <rect x="124" y="50" width="40" height="6"/>
    <rect x="124" y="62" width="40" height="6"/>
    <rect x="132" y="20" width="8" height="6"/>
    <rect x="148" y="20" width="8" height="6"/>
    <rect x="132" y="32" width="8" height="6"/>
    <rect x="148" y="32" width="8" height="6"/>
    <!-- M second column -->
    <rect x="176" y="14" width="40" height="6"/>
    <rect x="176" y="26" width="40" height="6"/>
    <rect x="176" y="38" width="40" height="6"/>
    <rect x="176" y="50" width="40" height="6"/>
    <rect x="176" y="62" width="40" height="6"/>
  </g>
</svg>`;

const targets = [
  { name: "logo-5-anthropic.png", svg: anthropicSvg, height: 64 },
  { name: "logo-6-ibm.png", svg: ibmSvg, height: 56 },
];

for (const t of targets) {
  const buf = await sharp(Buffer.from(t.svg))
    .resize({ height: t.height, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(DST, t.name), buf);
  const m = await sharp(buf).metadata();
  console.log(`${t.name}: ${m.width}x${m.height} hasAlpha=${m.hasAlpha}`);
}
console.log("done");
