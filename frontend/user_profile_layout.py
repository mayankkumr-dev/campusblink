import re

def rewrite_user_page(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    old_layout = '<div className="mx-auto max-w-5xl px-4 pb-10 pt-4 md:px-6">'
    new_layout = """<div className="w-full flex justify-center bg-white min-h-screen text-[#0F1419] pb-28">
      {/* Main Feed Column */}
      <div className="w-full max-w-[600px] border-x border-[#EFF3F4] flex flex-col min-h-screen pb-10">"""
    
    if old_layout in text:
        text = text.replace('<div className="min-h-screen bg-white pb-24 text-[#0F1419]">', '') # remove outer to avoid nesting issue
        text = text.replace(old_layout, new_layout)
        
        sidebar = """      </div>
      {/* Right Sidebar */}
      <div className="hidden lg:block w-[350px] pl-8 py-2 min-h-screen">
        <div className="sticky top-2">
          <div className="bg-[#F7F9F9] rounded-2xl mb-4 p-4 border border-[#EFF3F4]">
            <h2 className="font-bold text-xl mb-4 text-[#0F1419]">Search</h2>
            <div className="flex flex-wrap gap-2">
              <input type="text" placeholder="Search Campus..." className="w-full bg-white rounded-full px-4 py-2 border border-[#EFF3F4] outline-none text-sm placeholder-[#536471]" />
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
      </div>"""
        text = re.sub(r'(\s+)</div>\s+</div>\s+<FollowListModal', r'\1' + sidebar + r'\n\1</div>\n\1<FollowListModal', text)
        print(f"Replaced layout in {filepath}")
    else:
        print(f"NOT FOUND old_layout in {filepath}")

    with open(filepath, 'w') as f:
        f.write(text)

rewrite_user_page('src/app/components/UserProfilePage.tsx')
