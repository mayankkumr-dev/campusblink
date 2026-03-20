const fs = require('fs');

let content = fs.readFileSync('src/app/components/AdminLayout.tsx', 'utf-8');

// NavItem Component
content = content.replace(/gap-3 px-4 py-2 mb-1 rounded-lg transition-colors font-sans text-sm font-medium \$\{[\s\S]+?\}/m,
  "gap-[10px] h-[36px] px-[12px] mx-[8px] my-[2px] rounded-md transition-colors font-sans text-[14px] font-medium ${\n" +
  "        isActive\n" +
  "          ? 'bg-[#FEFCE8] text-[#0D0D0D] font-semibold'\n" +
  "          : 'text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]'\n" +
  "      }");
content = content.replace(/<Icon className="w-4 h-4" \/>/, '<Icon size={16} className={isActive ? "text-[#CA8A04]" : "text-[#9B9B9B]"} />');

// Section Label
content = content.replace(/px-4 mt-6 mb-2 text-xs font-sans font-bold text-\[#AAAAAA\] uppercase tracking-wider/g, "py-[20px] px-4 pb-[8px] font-sans font-medium text-[11px] text-[#9B9B9B] uppercase tracking-[1px]");

content = content.replace(/bg-\[#FAFAF8\] border-r border-black\/\[0\.08\]/g, "bg-[#FFFFFF] border-r border-[#E8E8E8]");
content = content.replace(/h-16 flex items-center px-6 border-b border-black\/\[0\.08\]/g, "h-[60px] border-b border-[#E8E8E8] flex items-center justify-between px-4 pl-4 shrink-0");

content = content.replace(/w-\[260px\] fixed top-0/g, "w-[240px] fixed top-0");
content = content.replace(/md:ml-\[260px\]/g, "md:ml-[240px]");

content = content.replace(/<button \n\s*onClick=\{handleLogout\}[\s\S]+?<\/button>/m,
  "<button onClick={handleLogout} className=\"w-full flex items-center gap-[10px] h-[36px] px-[12px] rounded-md text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D] transition-colors duration-150\">\n" +
  "          <LogOut size={16} className=\"text-[#9B9B9B]\" />\n" +
  "          <span className=\"text-[14px] leading-none mb-[-1px] font-medium\">Log out</span>\n" +
  "        </button>");

fs.writeFileSync('src/app/components/AdminLayout.tsx', content);

