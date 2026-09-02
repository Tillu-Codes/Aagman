const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, 'assets', 'images');
const OUT_DIR = path.join(__dirname, 'assets', 'images', 'optimized');
const SIZES = [
  { suffix: 'sm', width: 400 },
  { suffix: 'md', width: 800 },
];

async function optimizeImage(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath);
  const dirname = path.dirname(filePath);
  const relPath = path.relative(IMG_DIR, dirname);
  const outSubDir = path.join(OUT_DIR, relPath);
  fs.mkdirSync(outSubDir, { recursive: true });

  const img = sharp(filePath);
  const metadata = await img.metadata();

  for (const size of SIZES) {
    const outPath = path.join(outSubDir, `${basename}-${size.suffix}${ext}`);
    await sharp(filePath)
      .resize(size.width, null, { withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(outPath.replace(ext, '.webp'))
      .catch(async () => {
        await sharp(filePath)
          .resize(size.width, null, { withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(outPath.replace(ext, '.jpg'))
          .catch(async () => {
            await sharp(filePath)
              .resize(size.width, null, { withoutEnlargement: true })
              .png({ compressionLevel: 7 })
              .toFile(outPath.replace(ext, '.png'))
              .catch(() => console.warn(`Could not optimize ${outPath}`));
          });
      });
    console.log(`Created ${outPath.replace(ext, '.webp') || outPath}`);
  }

  const outPathOriginal = path.join(outSubDir, `${basename}${ext}`);
  await sharp(filePath)
    .webp({ quality: 85, effort: 4 })
    .toFile(outPathOriginal.replace(ext, '.webp'))
    .catch(async () => {
      await sharp(filePath)
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(outPathOriginal.replace(ext, '.jpg'))
        .catch(async () => {
          await sharp(filePath)
            .png({ compressionLevel: 7 })
            .toFile(outPathOriginal.replace(ext, '.png'))
            .catch(() => console.warn(`Could not optimize original for ${filePath}`));
        });
    });

  if (basename === 'image2') {
    const blurPath = path.join(outSubDir, 'image2-blurred.webp');
    await sharp(filePath)
      .resize(100, null)
      .blur(20)
      .webp({ quality: 20 })
      .toFile(blurPath)
      .catch(() => console.warn('Could not create blurred watermark'));
    console.log('Created blurred watermark for image2');
  }
}

async function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.log('assets/images/ directory not found. Place your images there and run again.');
    return;
  }

  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) walk(fullPath);
      else if (/\.(jpg|jpeg|png|webp)$/i.test(entry)) files.push(fullPath);
    }
  }
  walk(IMG_DIR);

  if (files.length === 0) {
    console.log('No images found in assets/images/. Place your images there and run again.');
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const file of files) {
    await optimizeImage(file);
  }

  console.log('\nOptimization complete! Use the optimized versions from assets/images/optimized/');
}

main().catch(err => console.error('Error:', err));