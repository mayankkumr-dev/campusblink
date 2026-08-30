const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'push.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldBlock = `    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '86400',
      },
      fcmOptions: {
        link: clickAction,
      },
    },`;

const newBlock = `    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '86400',
      },
      notification: {
        title: title || 'Campus Blink',
        body: body || 'You have a new update.',
        icon: '/logo2/Blue_transparent.png?v=8',
        badge: '/logo2/Blue_transparent.png?v=8',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: 'campus-blink-fcm',
        renotify: true,
      },
      fcmOptions: {
        link: clickAction,
      },
    },`;

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, code);
  console.log('webpush notification updated successfully');
} else {
  console.log('oldBlock not found');
}
