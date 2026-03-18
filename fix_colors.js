const fs = require('fs');
let file = fs.readFileSync('src/app/components/LoginRegisterPage.tsx', 'utf8');

// 1. Background fix
file = file.replace(
  'bg-[linear-gradient(180deg,#F7F4EA_0%,#FAFAF8_100%)]',
  'bg-white'
);

// 2. Form container fix
file = file.replace(
  'max-w-md mx-auto w-full flex-1 flex flex-col justify-center py-4 lg:py-2 rounded-[28px] border border-black/10 bg-white/92 px-5 shadow-[0_24px_60px_rgba(13,13,13,0.08)] backdrop-blur-sm md:px-7',
  'max-w-md mx-auto w-full flex-1 flex flex-col justify-center py-4 lg:py-2 px-6 md:px-10'
);

// 3. Inputs padding and border rounded-xl to match new style
file = file.replace(/placeholder="Enter your college email"/g, 'placeholder="john.doe@college.edu" className="rounded-xl h-11"');
file = file.replace(/className="pr-12"/g, 'className="pr-12 rounded-xl h-11"');

// 4. Update Remember me and Forgot Password
file = file.replace(
  '<span className="text-sm text-[#6B6B6B] group-hover:text-[#0D0D0D] transition-colors">Reconst fs = require('fs');
lecllet file = fs.readFileSy6B
// 1. Background fix
file = file.replace(
  'bg-[linear-gradient(180details</span>'
);

file = file.replace(
  '<button type="button" onClick={handleForgotPassword} className="text);

// 2. Fdi
m text-[#6B6B6B] hover:text-[#FFD600] transition-  'max-w-md mx-auto w-full flex-1 flex flex-col justify-center py-4 lg:py-2 px-6 md:px-10'
);

// 3. Inputs padding and border rounded-xl to match new style
file = file.replace(/placeholder="Enter Re);

// 3. Inputs padding and border rounded-xl to match new style
file = file.replace(/pldi
 clfile = file.replace(/placeholder="Enter your college email"/ <file = file.replace(/className="pr-12"/g, 'className="pr-12 rounded-xl h-11"');

// 4. Update Remember me and Forgot Password
fi-f
// 4. Update Remember me and Forgot Password
file = file.replace(
  '<span clx] file = file.replace(
  '<span className="te {  '<span classoader2 lecllet file = fs.readFileSy6B
// 1. Background fix
file = file.replace(
  'bg-[linear-gradient(180details</span>'

 // 1. Background fix
file = fgifile = file.replace    'bg-[linear-gradi  );

file = file.replace(
  '<button typent
r w  '<button type="bu  
// 2. Fdi
m text-[#6B6B6B] hover:text-[#FFD600] transition-  'max-w-md iv>m text-[  );

// 3. Inputs padding and border rounded-xl to match new style
file = file.replace(/placeholder="Enter Re);

// 3. Inputs padding and b      file = file.replace(/placeholder="Enter Re);

// 3. I6]"></div
// 3. Inputs padding and border rounded-xl   file = file.replace(/pldi
 clfile = file.replace(/placeholde
  clfile = file.replace(/yp
// 4. Update Remember me and Forgot Password
fi-f
// 4. Update Remember me and Forgot Password
file = file.replace(
  '<span clx] file = file.derfi-f
// 4. Update Remember me and Forgot Pate// cefile = file.replace(
  '<span clx] file = fmibold capitalize-none   '<span className="te {  '<span ed// 1. Background fix
file = file.replace(
  'bg-[linear-gradient(1 className="w-5 h-5" viewBox="0  'bg-[linear-gradi  
 // 1. Background fix
file = fgifile = .78file = fgifile = filv4
file = file.replace(
  '<button typent
r w  '<button-1.  '<button typent
r.0r w  '<button ty4"// 2. Fdi
m text-[#6B6B  m textath 
// 3. Inputs padding and border rounded-xl to match new style
file = file.2.8file = file.replace(/placeholder="Enter Re);

// 3. Inputs pfi
// 3. Inputs padding and b      file = filath
// 3. I6]"></div
// 3. Inp5-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.5// 3. Inputs pa.4 clfile = file.replace(/placeholde
  clfile = file.replace(/yp
// 4.     clfile = file.replace(/yp
// 4.3.// 4. Update Remember me a17fi-f
// 4. Update Remember me and Forgot Pa7.07l3.file = file.replace(
  '<span clx] file = f#E  '<span clx] file   // 4. Update Remember me and For    '<span clx] file = fmibold capitalize-none   '<span className=  file = file.replace(
  'bg-[linear-gradient(1 className="w-5 h-5" viewBox="0  'bg-[linear-gradi  
 e.  'bg-[linear-gradix, // 1. Background fix
file = fgifile = .78file = fgifile = filv4
file = filtefile = fgifile = .78onfile = fi'Update applied');
