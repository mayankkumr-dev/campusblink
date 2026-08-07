const fs = require('fs');
const profFile = '/Volumes/WORK/campus_blink_2/frontend/src/app/components/ProfessorSettingsPage.tsx';
const studFile = '/Volumes/WORK/campus_blink_2/frontend/src/app/components/StudentSettingsPage.tsx';

let profContent = fs.readFileSync(profFile, 'utf8');
let studContent = fs.readFileSync(studFile, 'utf8');

// 1. Add new icons to StudentSettingsPage
studContent = studContent.replace(
  "import { LogOut, Shield, KeyRound, MessageSquare, Star, Megaphone, ChevronRight, Moon } from 'lucide-react';",
  "import { LogOut, Shield, KeyRound, MessageSquare, Star, Megaphone, ChevronRight, Moon, Calendar, ChevronDown, CheckCircle2, RefreshCw, Trash2, Upload, FileText, Edit3, Save, Plus, Loader2 } from 'lucide-react';"
);

// 2. Add API imports
studContent = studContent.replace(
  "import { signOut } from '../../api/auth';",
  "import { signOut } from '../../api/auth';\nimport { uploadStudentScheduleFile, getStudentSchedule, saveStudentSchedule, deleteStudentSchedule } from '../../api/student';"
);

// 3. Extract Schedule logic
const logicStartMarker = "// Auto-expand 'schedule' section if navigated via CTA";
const logicEndMarker = "// Change Password State";
const logicStart = profContent.indexOf(logicStartMarker);
const logicEnd = profContent.indexOf(logicEndMarker);
let logicContent = profContent.slice(logicStart, logicEnd);
logicContent = logicContent.replaceAll('prof_parsed_schedule', 'student_parsed_schedule');
logicContent = logicContent.replaceAll('getProfessorSchedule', 'getStudentSchedule');
logicContent = logicContent.replaceAll('saveProfessorSchedule', 'saveStudentSchedule');
logicContent = logicContent.replaceAll('deleteProfessorSchedule', 'deleteStudentSchedule');
logicContent = logicContent.replaceAll('uploadProfessorScheduleFile', 'uploadStudentScheduleFile');
logicContent = logicContent.replaceAll('Professor Settings', 'Student Settings');

// Inject logic into StudentSettingsPage
const studLogicTarget = "const [isUpdatingPrivacy, setIsUpdatingPrivacy] = React.useState(false);";
studContent = studContent.replace(
  studLogicTarget,
  studLogicTarget + "\n  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);\n  const toggleSection = (section: string) => {\n    setExpandedSection(expandedSection === section ? null : section);\n  };\n\n  " + logicContent
);

// 4. Extract UI logic
const uiStartMarker = "{/* Upload Schedule Section */}";
const uiEndMarker = "{/* Appearance Section */}";
const uiStart = profContent.indexOf(uiStartMarker);
const uiEnd = profContent.indexOf(uiEndMarker);
let uiContent = profContent.slice(uiStart, uiEnd);

// Replace styles that are professor specific with student specific styles (bg-surface etc.)
// I'll keep the styles mostly intact since they are nice. But I'll adjust the toggleSection call if needed.
// StudentSettingsPage uses Link components directly in a column layout, but we'll adapt.
const studUiTarget = "<div className=\"bg-surface rounded-3xl border border-border-subtle overflow-hidden\">";
studContent = studContent.replace(
  studUiTarget,
  studUiTarget + "\n" + uiContent
);

fs.writeFileSync(studFile, studContent, 'utf8');
console.log('Successfully injected schedule into StudentSettingsPage.tsx');
