const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'push.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldBlock = `    // Omit root 'notification' to prevent Firebase Web SDK from auto-showing 
    // a duplicate notification, allowing our SW to handle it explicitly.
    data: {`;

const newBlock = `    // We MUST include the root notification object for iOS Safari (PWA) 
    // to actually wake up and show the push notification. Data-only is dropped by iOS.
    notification: {
      title: title || 'Campus Blink',
      body: body || 'You have a new update.',
    },
    data: {`;

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
}

const oldWebPushBlock = `    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '86400',
      },
      fcmOptions: {
        link: clickAction,
      },
    },`;

const newWebPushBlock = `    // Web Push config with high urgency and full notification styling
    webpush: {
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

if (code.includes(oldWebPushBlock)) {
  code = code.replace(oldWebPushBlock, newWebPushBlock);
}

fs.writeFileSync(filePath, code);
console.log('Restored push payload with webpush config');
