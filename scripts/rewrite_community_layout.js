const fs = require('fs');

let fileContent = fs.readFileSync('frontend/src/app/components/CommunityFeed.tsx', 'utf8');

// 1. Fix the "Hello Student" dynamically using authStore to handle cases where profile.name might be incomplete
fileContent = fileContent.replace(
  /Hello \{profile\?\.name\?\.split\(' '\)\[0\] \|\| 'Student'\}/g,
  "Hello {profile?.name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || 'Student'}"
);

// 2. Change grid definition to put sidebar on right
fileContent = fileContent.replace(
  /className="grid gap-4 xl:grid-cols-\[280px_minmax\(0,1fr\)\]"/g,
  'className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]"'
);

// 3. Swap <aside> and <section> order
const asideRegex = /(<aside[\s\S]*?<\/aside>)/;
const sectionRegex = /(<section[\s\S]*?<\/section>)/;

const asideMatch = fileContent.match(asideRegex);
const sectionMatch = fileContent.match(sectionRegex);

if (asideMatch && sectionMatch) {
  // Find where they are in the string
  const contentStart = fileContent.indexOf('<aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">');
  const sectionStart = fileContent.indexOf('<section className="rounded-[16px]');
  
  if (contentStart < sectionStart) {
    // aside is first, let's swap them
    // It's safer to do this with string splitting
    const beforeAside = fileContent.substring(0, contentStart);
    const afterSection = fileContent.substring(sectionStart + sectionMatch[1].length);
    
    fileContent = beforeAside + sectionMatch[1] + '\n\n          ' + asideMatch[1] + afterSection;
  }
}

fs.writeFileSync('frontend/src/app/components/CommunityFeed.tsx', fileContent);
console.log('rewritten successfully');
