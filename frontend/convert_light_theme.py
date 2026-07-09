import re
with open('src/app/components/CommunityFeed.tsx', 'r') as f:
    text = f.read()

replacements = [
    (r'bg-black/80', r'bg-white/80'),
    (r'bg-black', r'bg-white'),
    (r'bg-\[\#16181C\]', r'bg-[#F7F9F9]'),
    (r'text-white', r'text-[#0F1419]'),
    (r'text-\[\#71767b\]', r'text-[#536471]'),
    (r'border-\[\#2f3336\]', r'border-[#EFF3F4]'),
    (r'hover:bg-\[\#181818\]', r'hover:bg-[#000000]/5'),
    (r'hover:bg-\[\#080808\]', r'hover:bg-[#000000]/5'), # For PostCard equivalent inside CommunityFeed if any
]

for old, new in replacements:
    text = re.sub(old, new, text)

with open('src/app/components/CommunityFeed.tsx', 'w') as f:
    f.write(text)
