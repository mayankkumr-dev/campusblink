const fs = require('fs');
let file = fs.readFileSync('src/api/professor.js', 'utf-8');

file = file.replace(
  `export async function getPendingProfessors() {
  try {
    const { data: pendingProfessors, error } = await supabase
      .from('profiles')
      .select(\`
        *,
        colleges (
          name,
          short_name
        )
      \`)
      .eq('requested_role', 'teacher')
      .eq('role_request_status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return { data: pendingProfessors || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}`,
  `export async function getPendingProfessors() {
  try {
    const { data: pendingProfessors, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('requested_role', 'teacher')
      .eq('role_request_status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return { data: pendingProfessors || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}`
);

fs.writeFileSync('src/api/professor.js', file);
console.log('Fixed pending query');
