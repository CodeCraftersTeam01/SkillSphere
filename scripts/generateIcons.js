const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Crisp modern SkillSphere Star Logo SVG
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1F1E1B"/>
      <stop offset="100%" stop-color="#141413"/>
    </linearGradient>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E5E4E0"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <!-- Rounded App Icon Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Subtle border highlight -->
  <rect x="2" y="2" width="508" height="508" rx="110" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4"/>
  
  <!-- 4-pointed AI Sparkle Star -->
  <g transform="translate(100, 100) scale(13)">
    <!-- Path from brand icon: d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z" -->
    <path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z" fill="url(#starGrad)" filter="url(#glow)"/>
  </g>
</svg>
`;

// Maskable Icon with extra safe-area margin
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1F1E1B"/>
      <stop offset="100%" stop-color="#141413"/>
    </linearGradient>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E5E4E0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  <g transform="translate(136, 136) scale(10)">
    <path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z" fill="url(#starGrad)"/>
  </g>
</svg>
`;

async function generateAllIcons() {
  console.log('Generating PWA Icons...');

  // Save SVG
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), svgIcon);
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);

  // 192x192 PNG
  await sharp(Buffer.from(svgIcon))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));

  // 512x512 PNG
  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));

  // 512x512 Maskable PNG
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable.png'));

  // Apple Touch Icon 180x180
  await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  console.log('✅ PWA Icons generated successfully!');
}

generateAllIcons().catch(console.error);
