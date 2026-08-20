require('dotenv').config({ path: './backend/.env' });
const fetch = require('node-fetch');

async function checkClerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("No CLERK_SECRET_KEY found");
    return;
  }
  
  const res = await fetch('https://api.clerk.com/v1/users?limit=2', {
    headers: { 'Authorization': `Bearer ${secretKey}` }
  });
  
  if (!res.ok) {
    console.error("Clerk API failed:", res.status, await res.text());
    return;
  }
  
  const users = await res.json();
  console.log("Clerk users found:", users.length);
  if (users.length > 0) {
    console.log(users[0].email_addresses);
  }
}
checkClerk();
