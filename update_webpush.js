const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'push.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldWebPush = `    webpush: {
      headers: {
        Urgency: 'high',
      },
      fcmOptions: {
        link: clickAction,
      },
    },`;

const newWebPush = `    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '86400',
      },
      fcmOptions: {
        link: clickAction,
      },
    },`;

if (code.includes(oldWebPush)) {
  code = code.replace(oldWebPush, newWebPush);
  fs.writeFileSync(filePath, code);
  console.log('webpush updated successfully');
} else {
  console.log('webpush block not found, please check');
}
