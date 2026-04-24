import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const root = process.cwd();
const publicDir = path.join(root, "public");
const svgPath = path.join(publicDir, "favicon.svg");

async function main() {
  const svg = await fs.readFile(svgPath);

  const sizes = [
    { name: "favicon-16x16.png", size: 16 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "android-chrome-192x192.png", size: 192 },
    { name: "android-chrome-512x512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  const pngBuffers = new Map();

  for (const s of sizes) {
    const outPath = path.join(publicDir, s.name);
    const buf = await sharp(svg, { density: 600 })
      .resize(s.size, s.size, { fit: "contain" })
      .png()
      .toBuffer();
    pngBuffers.set(s.size, buf);
    await fs.writeFile(outPath, buf);
  }

  // favicon.ico (multi-size: 16 + 32)
  const ico = await toIco([pngBuffers.get(16), pngBuffers.get(32)].filter(Boolean));
  await fs.writeFile(path.join(publicDir, "favicon.ico"), ico);

  console.log("Favicons generated in /public");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

