const fs = require('fs');
const path = require('path');

const targetDirs = [path.join(__dirname, 'frontend/src'), path.join(__dirname, 'frontend/public')];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (/\.(ts|tsx|js|jsx|css|html|json)$/.test(file)) {
                results.push(file);
            }
        }
    });
    return results;
}

const colorMap = [
// hex replacements
{ old: /#FAFAF8/gi, new: '#FFFFFF' },
{ old: /#F5F4F0/gi, new: '#F8F9FF' },
{ old: /#F7F5F0/gi, new: '#F8F9FF' },
{ old: /#1C1C1E/gi, new: '#0A0F1E' },
{ old: /#0A0A0A/gi, new: '#0A0F1E' },
{ old: /#141414/gi, new: '#F8F9FF' }, // Note: #141414 maps to F8F9FF in prompt
{ old: /#1C1C1C/gi, new: '#FFFFFF' },
{ old: /#0D0D0D/gi, new: '#0A0F1E' },
{ old: /#6B6B6B/gi, new: '#64748B' },
{ old: /#888888/gi, new: '#64748B' },
{ old: /#9B9B9B/gi, new: '#94A3B8' },
{ old: /#AAAAAA/gi, new: '#94A3B8' },
{ old: /#444444/gi, new: '#64748B' },
{ old: /#C4C4C4/gi, new: '#CBD5E1' },
{ old: /#E8E8E8/gi, new: '#E2E8F0' },
{ old: /#D0D0D0/gi, new: '#CBD5E1' },
{ old: /#FFD600/gi, new: '#EAB308' },
{ old: /#E6C000/gi, new: '#CA8A04' },
{ old: /#FFF9E6/gi, new: '#FEF9C3' },
{ old: /#FEF3C7/gi, new: '#FEF9C3' },

// Classes replacing
{ old: /bg-\[\#FAFAF8\]/g, new: 'bg-white' },
{ old: /bg-\[\#0A0A0A\]/g, new: 'bg-[#0A0F1E]' },
{ old: /bg-\[\#FFD600\]/g, new: 'bg-[#2D4EF5]' },
{ old: /text-\[\#0D0D0D\]/g, new: 'text-[#0A0F1E]' },
{ old: /text-\[\#6B6B6B\]/g, new: 'text-[#64748B]' },
{ old: /border-\[\#E8E8E8\]/g, new: 'border-[#E2E8F0]' }
];

let files = [];
targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) files = files.concat(walk(dir));
});

files.push(path.join(__dirname, 'frontend/index.html'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    colorMap.forEach(map => {
        content = content.replace(map.old, map.new);
    });

    if (file.endsWith('manifest.json')) {
        try {
            let json = JSON.parse(content);
            json["theme_color"] = "#2D4EF5";
            json["background_color"] = "#FFFFFF";
            content = JSON.stringify(json, null, 2);
        } catch(e) {}
    }

    if (file.endsWith('index.html')) {
        content = content.replace(/<meta name="theme-color" content=".*">/, '<meta name="theme-color" content="#2D4EF5">');
    }
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated: ' + file);
    }
});

