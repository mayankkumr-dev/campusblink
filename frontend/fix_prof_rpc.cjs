const fs = require('fs');
let content = fs.readFileSync('src/api/professor.js', 'utf-8');

content = content.replace(
  /const \{ data: updatedProfile, error \} = await supabase\s*\.rpc\('admin_approve_professor', \{ p_admin_id: adminId, p_professor_id: professorId \}\);/g,
  `const { data: updatedProfile, error } = await supabase.from('profiles').update({ role: 'professor', requested_role: null, role_request_status: 'approved' }).eq('id', professorId).select().single();`
);

content = content.replace(
  /const \{ data: updatedProfile, error \} = await supabase\s*\.rpc\('admin_reject_professor', \{ p_admin_id: adminId, p_professor_id: professorId, p_reason: reason \}\);/g,
  `const { data: updatedProfile, error } = await supabase.from('profiles').update({ requested_role: null, role_request_status: 'rejected' }).eq('id', professorId).select().single();`
);

fs.writeFileSync('src/api/professor.js', content);
console.log('Fixed approve/reject professor RPCs');
