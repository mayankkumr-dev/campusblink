const http = require('http');

const data = JSON.stringify({ status: 'published' });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/notes/content/ebc3e59e-f700-43a9-b246-ed2092cc9a9d',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
