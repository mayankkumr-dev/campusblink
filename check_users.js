const apiKey = 'sk_test_H4RxqFwiVP2jO5yjeCiTbLVDTZ8AWP8w9k2tzdtlqP';
fetch('https://api.clerk.com/v1/users?limit=10', {
  headers: {
    'Authorization': 'Bearer ' + apiKey
  }
}).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data.map(u => ({
    id: u.id,
    email: u.email_addresses[0]?.email_address,
    verified: u.email_addresses[0]?.verification?.status
  })), null, 2));
}).catch(console.error);
