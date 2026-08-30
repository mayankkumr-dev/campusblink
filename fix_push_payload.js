const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'push.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldWebPushBlock = `    webpush: {
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

const newWebPushBlock = `    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '86400',
      },
      fcmOptions: {
        link: clickAction,
      },
    },`;

if (code.includes(oldWebPushBlock)) {
  code = code.replace(oldWebPushBlock, newWebPushBlock);
  fs.writeFileSync(filePath, code);
  console.log('webpush notification removed successfully');
} else {
  console.log('oldWebPushBlock not found');
}
