import re
with open('src/app/components/CommunityFeed.tsx', 'r') as f:
    text = f.read()

replacements = [
    (r'text-\[\#AAAAAA\]', r'text-[#536471]'),
    (r'text-\[\#B0B0B0\]', r'text-[#536471]'),
    (r'text-\[\#8A8A8A\]', r'text-[#536471]'),
    (r'text-\[\#222222\]', r'text-[#0F1419]'),
    (r'border-\[\#F4E7A6\]', r'border-[#EFF3F4]'), # Old artifacts?
    (r'border-\[\#EFE5BA\]', r'border-[#EFF3F4]'),
    (r'bg-\[\#FFFDF4\]', r'bg-[#F7F9F9]'),
    (r'bg-\[\#F5F4F0\]', r'bg-[#E7E7E8]/20'),
]

for old, new in replacements:
    text = re.sub(old, new, text)

with open('src/app/components/CommunityFeed.tsx', 'w') as f:
    f.write(text)
