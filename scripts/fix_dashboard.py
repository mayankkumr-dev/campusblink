with open('/Volumes/WORK/campus_blink_2/frontend/src/app/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("</section>\n      </div>\n\n\n      </div>\n      <div className=\"md:hidden w-full\">", "</section>\n      </div>\n      <div className=\"md:hidden w-full\">")
content = content.replace("</section>\n      </div>\n      </div>\n      <div className=\"md:hidden w-full\">", "</section>\n      </div>\n      <div className=\"md:hidden w-full\">")

with open('/Volumes/WORK/campus_blink_2/frontend/src/app/components/StudentDashboard.tsx', 'w') as f:
    f.write(content)
