const CLERK_PUBLISHABLE_KEY = 'pk_test_bW9kZXN0LWZvd2wtNTM1MS5jbGVyay5hY2NvdW50cy5kZXYk';
const email = 'mewali3218@bevriz.com';
const newPassword = 'TestPassword@123';

async function run() {
  const fapi = 'https://modest-fowl-5351.clerk.accounts.dev/v1/client/sign_ins';
  const signinRes = await fetch(fapi, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:5173',
      'User-Agent': 'Mozilla/5.0'
    },
    body: new URLSearchParams({
      identifier: email,
      password: newPassword,
      strategy: 'password'
    })
  });
  
  const signinData = await signinRes.json();
  console.log('Sign in response:', JSON.stringify(signinData, null, 2));
}

run().catch(console.error);
