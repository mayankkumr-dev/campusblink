import re
with open('src/app/components/CommunityFeed.tsx', 'r') as f:
    text = f.read()

replacements = [
    (r'bg-white', r'bg-black'),
    (r'bg-\[\#FAFAF8\]', r'bg-black'),
    (r'text-\[\#0D0D0D\]', r'text-white'),
    (r'text-\[\#6B6B6B\]', r'text-[#71767b]'),
    (r'border-\[\#F4E7A6\]', r'border-[#2f3336]'),
    (r'border-\[\#0D0D0D\]/5', r'border-[#2f3336]'),
    (r'border-\[\#0D0D0D\]/10', r'border-[#2f3336]'),
    (r'border-\[\#0D0D0D\]/20', r'border-[#2f3336]'),
    (r'bg-\[linear-gradient\([^\]]+\)\]', r'bg-[#16181C]'),
    (r'shadow-\[0_[^\]]+\]', r''),
    (r'ring-\[\#F4E7A6\]', r'ring-transparent'),
    (r'bg-\[\#F2F2F2\]', r'bg-[#16181C]'),
    (r'bg-\[\#0D0D0D\]', r'bg-[#1d9bf0]'),
    (r'hover:bg-\[\#FFD600\]', r'hover:bg-[#1a8cd8]'),
    (r'hover:text-\[\#0D0D0D\]', r'hover:text-white'),
    (r'text-[#FFD600]', r'text-white'),
    (r'text-[#1D9BF0]', r'text-[#1d9bf0]'),
    (r'bg-\[\#FFD600\]', r'bg-[#1d9bf0]'),
]

for old, new in replacements:
    text = re.sub(old, new, text)

with open('src/app/components/CommunityFeed.tsx', 'w') as f:
    f.write(text)
