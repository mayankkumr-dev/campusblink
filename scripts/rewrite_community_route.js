const fs = require('fs');

let routes = fs.readFileSync('frontend/src/app/routes.tsx', 'utf8');

const communityRoute = `
              {
                path: 'community-hub',
                lazy: async () => ({
                  Component: (await import('./components/AdminCommunityHub')).AdminCommunityHub,
                }),
              },`;

if (!routes.includes("path: 'community-hub'")) {
    routes = routes.replace(
        "              {\n                path: 'users',", 
        communityRoute + "\n              {\n                path: 'users',"
    );
}

fs.writeFileSync('frontend/src/app/routes.tsx', routes);
console.log("Added /community-hub route");
