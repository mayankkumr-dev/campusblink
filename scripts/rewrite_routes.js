const fs = require('fs');

let routes = fs.readFileSync('frontend/src/app/routes.tsx', 'utf8');

// Replace standard user/canteen/professor routes with accounts 
// Actually it's easier to just APPEND `{ path: 'accounts', lazy: () => import('./components/AdminAccountsHub')... }` 
// and keep the other paths so legacy code/links don't break.
// Wait, the prompt says "Build Unified Users/Professors/Canteen Page".
// Let's add the accounts path to routes.tsx.
const accountsRoute = `
              {
                path: 'accounts',
                lazy: async () => ({
                  Component: (await import('./components/AdminAccountsHub')).AdminAccountsHub,
                }),
              },`;

if (!routes.includes("path: 'accounts'")) {
    routes = routes.replace(
        "              {\n                path: 'users',", 
        accountsRoute + "\n              {\n                path: 'users',"
    );
}

fs.writeFileSync('frontend/src/app/routes.tsx', routes);
console.log("Added /accounts route");
