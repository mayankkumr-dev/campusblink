const fs = require('fs');

let content = fs.readFileSync('src/app/components/LandingPage.tsx', 'utf-8');

// 1. Restore mascot & glows in Hero Section
if (!content.includes('animate-mascot')) {
  content = content.replace(
    /<div className="w-full h-full flex flex-col/,
    `<div className="absolute bottom-[20%] left-[-10%] w-[50%] aspect-square bg-[#FFD600] opacity-[0.12] blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute top-[10%] right-[-10%] w-[30%] aspect-square bg-[#C4817A] opacity-[0.08] blur-[100px] pointer-events-none rounded-full" />
        <img src={onlyLogoTransparent} className="absolute bottom-[5%] right-0 w-[50vw] max-w-[600px] opacity-[0.03] pointer-events-none animate-mascot object-contain" alt="Campus Blink" loading="eager" width={600} height={600} style={{ objectFit: 'contain' }} />

        <div className="w-full h-full flex flex-col`
  );
}

// 2. Restore phone mockup rounded corners
content = content.replace(/rounded-lg border-\[6px\]/g, 'rounded-[40px] border-[6px]');
content = content.replace(/bg-\[#FFD600\] rounded-md p-4 shrink-0 shadow-soft/g, 'bg-[#FFD600] rounded-[20px] p-4 shrink-0 shadow-[0_0_24px_rgba(255,214,0,0.3)]');
content = content.replace(/shadow-soft/g, 'shadow-[0_0_24px_rgba(255,214,0,0.3)]'); 
content = content.replace(/rounded-md bg-white\/80 backdrop-blur-md border border-white\/20 p-\[12px\] flex items-center gap-3/g, "rounded-[20px] bg-white/80 backdrop-blur-md border border-white/20 p-[12px] flex items-center gap-3");

// 3. Restore emojis
content = content.replace(/Now Live For Students/g, '🚀 Now Live For Students');
content = content.replace(/Invite Only/g, '🔒 Invite Only');

// 4. Restore buttons
content = content.replace(/rounded-md hover:bg-\[#FFD600\]/g, 'rounded-full hover:bg-[#FFD600]');
content = content.replace(/rounded-md font-medium flex items-center gap-2/g, 'rounded-full font-medium flex items-center gap-2');

// 5. Restore specific borders in phone
content = content.replace(/rounded-md bg-\[#FFD600\] p-3 flex/g, 'rounded-[16px] bg-[#FFD600] p-3 flex');


fs.writeFileSync('src/app/components/LandingPage.tsx', content);

// Also restore student dashboard
let std = fs.readFileSync('src/app/components/StudentDashboard.tsx', 'utf-8');
std = std.replace(/Hey, (.*?)!/, 'Hey, $1! 👋');
fs.writeFileSync('src/app/components/StudentDashboard.tsx', std);
