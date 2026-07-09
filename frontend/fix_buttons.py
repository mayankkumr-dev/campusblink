import re

with open('src/app/components/CommunityFeed.tsx', 'r') as f:
    text = f.read()

# Replace text-[#0F1419] with text-white whenever it appears in a class list that ALSO has an opaque bg-[#1d9bf0]
# e.g., bg-[#1d9bf0] px-4 py-2 text-sm font-bold text-[#0F1419]
# but ignore bg-[#1d9bf0]/15
# A simple regex match for strings within quotes starting with 'className="..."'
def replace_text_color(match):
    cls = match.group(0)
    if 'bg-[#1d9bf0]' in cls and 'bg-[#1d9bf0]/' not in cls:
        cls = cls.replace('text-[#0F1419]', 'text-white')
    return cls

# Match any class attribute
text = re.sub(r'className=(["\'`])(.*?)\1', replace_text_color, text)
text = re.sub(r'className=\{\`(.*?)\`\}', replace_text_color, text)

# Handle text-[#0F1419] directly associated with other dark action buttons (like Post icon bg-black)
text = text.replace("bg-[#1d9bf0] hover:bg-[#1a8cd8] text-[#0F1419]", "bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white")

with open('src/app/components/CommunityFeed.tsx', 'w') as f:
    f.write(text)
