const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/app/components/StudentDashboard.tsx');
let code = fs.readFileSync(file, 'utf8');

// Replace "Overview" with the logo
code = code.replace(
  /<h1 className="font-syne font-extrabold text-3xl tracking-tight text-\[var\(--text-primary\)\]">Overview<\/h1>/g,
  `<img src="/logo2/Blue_transparent.png" alt="Campus Blink" className="h-12 w-auto object-contain drop-shadow-sm" />`
);

// Add Sun icon import
if (!code.includes('import {') || !code.includes('Sun')) {
  code = code.replace('import { Card }', 'import { Sun } from "lucide-react";\nimport { Card }');
}

// Update the entire hero and grid section
code = code.replace(
  /{[\s\S]*?\/\* Hero Greeting \*\/[\s\S]*?\/div>\s*\/\* 2x2 Modules with GenZ Aesthetics \*\/[\s\S]*?\/div>/,
  `{/* Hero Section & Modules overlapping */}
      <div className="relative mb-12">
        {/* Main background container with the image on the right */}
        <div className="relative rounded-[2rem] p-6 md:p-10 mb-[-3rem] overflow-hidden border border-black/5 bg-[#FDFDFC]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 min-h-[160px]">
            <div className="max-w-lg relative pt-4">
              <h2 className="font-syne font-extrabold text-4xl md:text-[2.75rem] mb-2 text-[#0F172A] tracking-tight leading-[1.1]">
                Good afternoon, {firstName}.
                <br/>
                What's your next move?
              </h2>
              <Sun className="absolute top-2 right-4 md:-right-6 w-8 h-8 text-black" />
            </div>
            
            <div className="absolute top-0 right-0 w-[45%] h-[120%] hidden md:block z-0">
               <img src="/college.png" alt="Campus Building" className="w-full h-full object-cover object-center translate-y-[-10%] rounded-2xl" />
            </div>
          </div>
        </div>

        {/* 4 Cards (Overlapping) */}
        <div className="relative z-20 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-2 md:px-0">
          {[
            { icon: Store, title: 'Buy & Sell', status: 'All Colleges 🌐', path: '/student/buy-sell', bg: 'bg-blue-100', color: 'text-blue-600', hover: 'hover:border-blue-300 hover:shadow-md hover:-translate-y-1' },
            { icon: Coffee, title: 'Canteen', status: 'Your Campus Only 🏫', path: '/student/canteen', bg: 'bg-orange-100', color: 'text-orange-600', hover: 'hover:border-orange-300 hover:shadow-md hover:-translate-y-1' },
            { icon: Printer, title: 'Print Shop', status: 'Your Campus Only 🏫', path: '/student/print', bg: 'bg-green-100', color: 'text-green-600', hover: 'hover:border-green-300 hover:shadow-md hover:-translate-y-1', backdrop: 'bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm' },
            { icon: Users, title: 'Community', status: 'All Colleges 🌐', path: '/student/community', bg: 'bg-purple-100', color: 'text-purple-600', hover: 'hover:border-purple-300 hover:shadow-md hover:-translate-y-1', backdrop: 'bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm' },
          ].map((mod, i) => (
            <button
              key={i}
              onClick={() => navigate(mod.path)}
              className={\`module-card rounded-[2rem] p-4 md:p-5 text-left relative overflow-hidden transition-all duration-300 group focus:outline-none \${mod.backdrop || 'bg-white shadow-soft border border-black/5'} \${mod.hover}\`}
            >
              <div className={\`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 \${mod.bg} transition-transform group-hover:scale-110\`}>
                 <mod.icon className={\`w-6 h-6 \${mod.color}\`} />
              </div>
              <h3 className="module-title font-syne font-extrabold text-[#0F172A] leading-tight mb-1 text-xl">
                {mod.title}
              </h3>
              <p className="module-subtitle font-sans text-slate-500 font-medium tracking-wide text-xs">{mod.status}</p>
            </button>
          ))}
        </div>
      </div>`
);

fs.writeFileSync(file, code);
