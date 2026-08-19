const apiKey = 'sk_test_H4RxqFwiVP2jO5yjeCiTbLVDTZ8AWP8w9k2tzdtlqP';
fetch('https://api.clerk.com/v1/users?limit=2', {
  headers: {
    'Authorization': 'Bearer ' + apiKey
  }
}).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data.map(u => ({
    id: u.id,
    two_factor_enabled: u.two_factor_enabled,
    backup_code_enabled: u.backup_code_enabled
  })), null, 2));
}).catch(console.error);
