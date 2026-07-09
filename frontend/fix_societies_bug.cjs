const fs = require('fs');
let file = fs.readFileSync('src/app/components/AdminSocietiesPage.tsx', 'utf-8');

if(file.includes(".eq('id', societyId)")) {
   console.log("Bug is already fixed or not in AdminSocietiesPage.");
} else if (file.includes("await adminAPI.updateSocietyUser(editingId, dataToSubmit);")) {
   console.log("Bug resides in admin.js API...");
}

