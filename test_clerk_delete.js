const fetch = require('node-fetch');
require('dotenv').config({ path: 'backend/.env' });

async function check() {
  const clerkUserId = 'user_3I4ZSySmpVTXtty2IPcEETRkDfF'; // from previous db check
  const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`
    }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}
check();
