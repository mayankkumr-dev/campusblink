const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/app/components/AdminSocietiesPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

if(!content.includes('import { uploadImage } from')) {
    content = content.replace("import { Building2", "import { uploadImage } from '../../lib/cloudinary';\nimport { Building2");
}

if (!content.includes('bio:')) {
    content = content.replace("theme_color: '#0D0D0D'", "theme_color: '#0D0D0D',\n    bio: '',\n    avatar_url: ''");
}

if (!content.includes('website:')) {
    content = content.replace(
      "theme_color: society.theme_color || '#0D0D0D'",
      "theme_color: society.theme_color || '#0D0D0D',\n      bio: society.bio || '',\n      avatar_url: society.avatar_url || ''"
    );
}

if (!content.includes('const [imageFile, setImageFile]')) {
    content = content.replace(
        "const [updating, setUpdating] = useState(false);",
        "const [updating, setUpdating] = useState(false);\n  const [imageFile, setImageFile] = useState<File | null>(null);"
    );
}

if (!content.includes('if (imageFile)')) {
    const handleUpdate = `
    try {
      setUpdating(true);
      let dataToSubmit = { ...editFormData, username: editFormData.username.replace('@', '') };
      
      if (imageFile) {
        try {
          const url = await uploadImage(imageFile, 'avatars');
          if (url) dataToSubmit.avatar_url = url;
        } catch (err) {
          toast.error('Failed to upload society avatar');
        }
      }
      
      await adminAPI.updateSocietyUser(editingId, dataToSubmit);
    `;
    content = content.replace(
        `try {\n      setUpdating(true);\n      const dataToSubmit = { ...editFormData, username: editFormData.username.replace('@', '') };\n      await adminAPI.updateSocietyUser(editingId, dataToSubmit);`,
        handleUpdate
    );
}

// Ensure the form contains fields for avatar_url and bio
if (!content.includes('<textarea\n                    value={editFormData.bio}')) {
    const formFields = `
              <div>
                <label className="block text-sm font-medium text-[#0D0D0D] mb-1">Bio (About)</label>
                <div className="relative">
                  <textarea
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    className="w-full px-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-[#FFD600] outline-none transition-all resize-none h-24"
                    placeholder="Short description of the society..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0D0D0D] mb-1">Society Avatar</label>
                <div className="relative mt-2 flex items-center gap-3">
                   {(editFormData.avatar_url || imageFile) && (
                      <img src={imageFile ? URL.createObjectURL(imageFile) : editFormData.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-black/10" />
                   )}
                   <input 
                     type="file" 
                     accept="image/*" 
                     onChange={(e) => { if(e.target.files && e.target.files[0]) setImageFile(e.target.files[0]) }} 
                     className="text-sm text-[#6B6B6B]" 
                   />
                </div>
              </div>

              <div className="pt-2">`;
    content = content.replace(`<div className="pt-2">`, formFields);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Patched AdminSocietiesPage.tsx!');
