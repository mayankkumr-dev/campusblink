const fs = require('fs');
let file = fs.readFileSync('src/api/admin.js', 'utf-8');

file = file.replace(
  "updateSocietyUser: async (societyId, updateData) => {\\n    const { data: session } = await supabase.auth.getSession();\\n    const adminId = session?.session?.user?.id;\\n    \\n    const { data, error } = await supabase\\n      .from('profiles')\\n      .update(updateData)\\n      .eq('id', societyId)\\n      .select()\\n      .single();",
  "updateSocietyUser: async (societyId, updateData) => {\\n    const { data: session } = await supabase.auth.getSession();\\n    const adminId = session?.session?.user?.id;\\n    \\n    const { data, error } = await supabase\\n      .from('societies')\\n      .update(updateData)\\n      .eq('id', societyId)\\n      .select()\\n      .single();"
);

fs.writeFileSync('src/api/admin.js', file);
console.log('Fixed society update bug!');
