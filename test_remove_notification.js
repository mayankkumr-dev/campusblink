const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'push.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldBlock = `    notification: {
      title: title || 'Campus Blink',
      body: body || 'You have a new update.',
    },
    data: {`;

const newBlock = `    // Omit root 'notification' to prevent Firebase Web SDK from auto-showing 
    // a duplicate notification, allowing our SW to handle it explicitly.
    data: {`;

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, code);
  console.log('root notification block removed successfully');
} else {
  console.log('oldBlock not found');
}
