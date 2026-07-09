const fs = require('fs');
['frontend/src/app/components/CanteenDashboardPage.tsx', 'frontend/src/app/components/PrintDashboardPage.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/toast\.error\("Failed to reject order"\);/g, 'toast.error("Failed to reject order: " + error.message);');
  content = content.replace(/toast\.error\("Failed to accept order"\);/g, 'toast.error("Failed to accept order: " + error.message);');
  fs.writeFileSync(file, content);
});
console.log('Errors updated.');
