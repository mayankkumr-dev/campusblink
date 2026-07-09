import re

def rewrite_page(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Step 1: Color replacements to X Light Theme
    replacements = [
        (r'bg-\[\#FAFAF8\]', r'bg-white'),
        (r'text-\[\#0D0D0D\]', r'text-[#0F1419]'),
        (r'text-\[\#6B6B6B\]', r'text-[#536471]'),
        (r'text-\[\#9B9B9B\]', r'text-[#536471]'),
        (r'border-black/10', r'border-[#EFF3F4]'),
        (r'border-\[\#E8E8E8\]', r'border-white'),
        (r'hover:bg-[#F5F4F0]', r'hover:bg-[#0F1419]/10'),
        (r'bg-black/\[0\.015\]', r'bg-[#0F1419]/5'),
        (r'bg-[#F2F0EB]', r'bg-[#EFF3F4]'),
        (r'hover:bg-[#F2F2F2]', r'hover:bg-[#0F1419]/10'),
        (r'font-syne', r''), # Remove syne font, use default sans
        # PostCard replacements if they were in the file
    ]
    for old, new in replacements:
        text = re.sub(old, new, text)

    # Step 2: Change max-w-[1100px] to the flex layout
    old_layout = r'<div className="mx-auto w-full max-w-\[1100px\] pb-10 md:px-0">'
    new_layout = r"""<div className="w-full flex justify-center bg-white min-h-screen text-[#0F1419] pb-28">
      {/* Main Feed Column */}
      <div className="w-full max-w-[600px] border-x border-[#EFF3F4] flex flex-col min-h-screen pb-10">"""
    
    if old_layout in text:
        text = text.replace(old_layout, new_layout)
        
        # Inject the right sidebar before the last closing divs of the render
        # We need to find the end of the return statement.
        # This is risky with regex. Let's just string.rreplace
        sidebar = r"""      </div>
      {/* Right Sidebar */}
      <div className="hidden lg:block w-[350px] pl-8 py-2 min-h-screen">
        <div className="sticky top-2">
          <div className="bg-[#F7F9F9] rounded-2xl mb-4 p-4 border border-[#EFF3F4]">
            <h2 className="font-bold text-xl mb-4 text-[#0F1419]">Filter by college</h2>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full px-4 py-1.5 text-sm font-bold transition bg-[#1d9bf0] text-white">All</button>
            </div>
          </div>
          <div className="bg-[#F7F9F9] rounded-2xl p-4 border border-[#EFF3F4]">
            <h2 className="font-bold text-xl mb-4 text-[#0F1419]">What's happening</h2>
            <div className="mb-4 cursor-pointer group">
              <p className="text-sm text-[#536471]">Trending in Campus</p>
              <p className="font-bold text-[#0F1419] mt-0.5 group-hover:underline">#Hackathon2024</p>
              <p className="text-sm text-[#536471] mt-0.5">2,543 posts</p>
            </div>
            <button className="text-[#1d9bf0] hover:text-[#1a8cd8] text-[15px] transition">Show more</button>
          </div>
        </div>
      </div>
"""
        # Find the last `    </div>\n  );\n};` or similar
        last_divs = "    </div>\n    </div>\n  );\n"
        if last_divs in text:
             text = text.replace(last_divs, sidebar + "    </div>\n  );\n")
        else:
             print(f"Warning: could not find last divs in {filepath}")

    with open(filepath, 'w') as f:
        f.write(text)

rewrite_page('src/app/components/ProfilePage.tsx')
rewrite_page('src/app/components/UserProfilePage.tsx')
