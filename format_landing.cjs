const fs = require('fs');

let content = fs.readFileSync('src/app/components/LandingPage.tsx', 'utf-8');

// Remove Hero Background Glows
content = content.replace(/<div className="absolute[^"]*blur-\[100px\][^"]*" \/>/g, '');
content = content.replace(/<img src=\{onlyLogoTransparent\} className="absolute bottom-\[5%\].+?animate-mascot.+?\/>/, '');

// Remove glowing shadow on live widget
content = content.replace(/shadow-\[0_0_24px_rgba\(255,214,0,0\.3\)\]/g, 'shadow-soft');

// Change card borders on phone mockup to clean borders
content = content.replace(/rounded-\[40px\]/g, 'rounded-lg');
content = content.replace(/rounded-\[20px\]/g, 'rounded-md');

// Navbar height tweaks
content = content.replace(/h-\[70px\]/g, 'h-[60px]');
content = content.replace(/h-\[60px\] md:h-\[80px\]/g, 'h-[36px]');

fs.writeFileSync('src/app/components/LandingPage.tsx', content);
