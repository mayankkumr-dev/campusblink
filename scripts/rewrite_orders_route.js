const fs = require('fs');

let routes = fs.readFileSync('frontend/src/app/routes.tsx', 'utf8');

const ordersRoute = `
              {
                path: 'orders',
                lazy: async () => ({
                  Component: (await import('./components/AdminOrdersHub')).AdminOrdersHub,
                }),
              },`;

if (!routes.includes("path: 'orders'")) {
    routes = routes.replace(
        "              {\n                path: 'users',", 
        ordersRoute + "\n              {\n                path: 'users',"
    );
}

fs.writeFileSync('frontend/src/app/routes.tsx', routes);
console.log("Added /orders route");
