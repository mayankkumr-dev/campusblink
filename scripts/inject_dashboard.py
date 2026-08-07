import re

prof_file = '/Volumes/WORK/campus_blink_2/frontend/src/app/components/ProfessorDashboard.tsx'
stud_file = '/Volumes/WORK/campus_blink_2/frontend/src/app/components/StudentDashboard.tsx'

with open(prof_file, 'r') as f:
    prof_content = f.read()

with open(stud_file, 'r') as f:
    stud_content = f.read()

# 1. Imports
# Need Calendar, Clock, MapPin, CheckCircle2, ChevronRight, X, BookOpen
imports_to_add = "import { MapPin, X } from 'lucide-react';"
# Also need getStudentSchedule
imports_to_add += "\nimport { getStudentSchedule } from '../../api/student';"

stud_content = stud_content.replace(
    "import { supabase } from '../../lib/supabase';",
    "import { supabase } from '../../lib/supabase';\n" + imports_to_add
)

# 2. Logic (getCurrentDayCode, getClassTimeStatus)
# Look for these functions before ProfessorDashboard component
func_pattern = re.compile(r'function getCurrentDayCode.*?function getClassTimeStatus.*?^}', re.MULTILINE | re.DOTALL)
match = func_pattern.search(prof_content)
if match:
    funcs = match.group(0)
    stud_content = stud_content.replace(
        "export const StudentDashboard: React.FC = () => {",
        funcs + "\n\nexport const StudentDashboard: React.FC = () => {"
    )

# 3. State variables
state_vars = """
  const [schedule, setSchedule] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('student_parsed_schedule');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [selectedDayTab, setSelectedDayTab] = useState<string>(getCurrentDayCode());
"""

stud_content = stud_content.replace(
    "const [isOffline, setIsOffline] = useState(!navigator.onLine);",
    "const [isOffline, setIsOffline] = useState(!navigator.onLine);\n" + state_vars
)

# 4. Load schedule in handleRefreshAll
stud_content = stud_content.replace(
    "await Promise.all([loadRecentActivity(), loadInvites()]);",
    """await Promise.all([
      loadRecentActivity(), 
      loadInvites(), 
      getStudentSchedule().then(res => { if (res.data) setSchedule(res.data) })
    ]);"""
)

# 5. Load schedule in useEffect
stud_content = stud_content.replace(
    "loadRecentActivity();\n    loadInvites();",
    "loadRecentActivity();\n    loadInvites();\n    getStudentSchedule().then(res => { if (res.data) setSchedule(res.data) });"
)

# 6. UI Injection
# We need to extract the "Today's Schedule & Classes Section" from ProfessorDashboard
# And adapt it.
ui_desktop_start = "{/* Today's Schedule & Classes Section (Pure Premium Light-Mode Theme) */}"
ui_desktop_end = "      {/* Full Timetable Weekly Grid Modal */}"
start_idx = prof_content.find(ui_desktop_start)
end_idx = prof_content.find(ui_desktop_end)
ui_desktop = prof_content[start_idx:end_idx]

modal_start = "{/* Full Timetable Weekly Grid Modal */}"
modal_end = "{/* Quick Actions & Controls Panel */}"
m_start_idx = prof_content.find(modal_start)
m_end_idx = prof_content.find(modal_end)
modal_ui = prof_content[m_start_idx:m_end_idx]

# Mobile UI
ui_mobile_start = "{/* Today's Schedule (Swipeable UI) */}"
ui_mobile_end = "{/* 4. Recent Activity Feed (Clean List with Dividers) */}"
ui_mob_start_idx = prof_content.find(ui_mobile_start)
ui_mob_end_idx = prof_content.find("          {/* Recent Activity") # Find a safe endpoint in mobile
if ui_mob_start_idx != -1:
    # Need to properly extract just the mobile section
    part = prof_content[ui_mob_start_idx:]
    # Find the end of <section className="mb-8">
    # Let's just find "</section>"
    sec_end = part.find("</section>") + 10
    ui_mobile = part[:sec_end]
else:
    ui_mobile = ""

# Clean up colors
def clean_colors(text):
    text = text.replace('dark:bg-prof-bg-surface', 'dark:bg-[#161922]')
    text = text.replace('dark:border-prof-border-subtle', 'dark:border-slate-800')
    text = text.replace('dark:text-prof-text-primary', 'dark:text-white')
    text = text.replace('dark:text-prof-text-secondary', 'dark:text-slate-400')
    text = text.replace('dark:text-prof-text-tertiary', 'dark:text-slate-500')
    text = text.replace('dark:bg-prof-bg-surface-raised', 'dark:bg-slate-800/80')
    text = text.replace('dark:bg-prof-bg-surface-hover', 'dark:bg-slate-800/40')
    text = text.replace('/professor/settings?section=schedule', '/student/settings?section=schedule')
    text = text.replace('Faculty Timetable', 'Student Timetable')
    text = text.replace('Automated Faculty Timetable', 'Automated Student Timetable')
    return text

ui_desktop = clean_colors(ui_desktop)
modal_ui = clean_colors(modal_ui)
ui_mobile = clean_colors(ui_mobile)

# Inject Desktop UI after "2. The One or Two Things Needing Action Today" or before "3. Compact Grid"
# Actually, let's put it right after the Hero card or Quick Actions Layer.
injection_point = "{/* 3. Compact Grid of Services (2×2 Icon Grid / Apple Wallet Shortcuts) */}"
injection = f"""
      <div className="hidden md:block w-full">
        {ui_desktop}
      </div>
      <div className="md:hidden w-full">
        {ui_mobile}
      </div>
"""
stud_content = stud_content.replace(injection_point, injection + "\n      " + injection_point)

# Inject Modal at the end of the root div
root_end = "    </div>\n  );\n};"
stud_content = stud_content.replace(
    root_end,
    modal_ui + "\n" + root_end
)

with open(stud_file, 'w') as f:
    f.write(stud_content)

print("Injected UI into StudentDashboard.tsx")
