const fs = require('fs');
let file = fs.readFileSync('src/api/admin.js', 'utf-8');

file = file.replace(
  /const \{ error: rpcError \} = await supabase\.rpc\('admin_approve_professor', \{\s*target_user_id: userId\s*\}\);\s*if \(rpcError\) throw rpcError;/g,
  `const { error: rpcError } = await supabase.from('profiles').update({ role: 'professor', requested_role: null, role_request_status: 'approved' }).eq('id', userId);
      if (rpcError) throw rpcError;`
);

fs.writeFileSync('src/api/admin.js', file);
console.log('Bypassed RPC logic to direct table update.');
