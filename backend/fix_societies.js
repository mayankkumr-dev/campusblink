const fs = require('fs');
let content = fs.readFileSync('../frontend/src/app/components/AdminSocietiesPage.tsx', 'utf8');

// Imports
content = content.replace('Building2, Plus, Mail, Lock, User, Palette', 'Building2, Plus, Mail, Lock, User, Palette, Edit2');

// State
content = content.replace('const [creating, setCreating] = useState(false);', 
`const [creating, setCreating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    username: '',
    college: '',
    theme_color: '#0D0D0D'
  });`);

// Functions
content = content.replace('const handleCreateSociety = async', 
`const openEditModal = (society: any) => {
    setEditingId(society.id);
    setEditFormData({
      name: society.name || '',
      username: society.username || '',
      college: society.college || '',
      theme_color: society.theme_color || '#0D0D0D'
    });
    setShowEditModal(true);
  };

  const handleUpdateSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.username) {
      toast.error('Name and username are required');
      return;
    }

    try {
      setUpdating(true);
      const dataToSubmit = { ...editFormData, username: editFormData.username.replace('@', '') };
      await adminAPI.updateSocietyUser(editingId, dataToSubmit);
      toast.success('Society updated successfully!');
      setShowEditModal(false);
      fetchSocieties();
    } catch (error: any) {
      console.error('Error updating society:', error);
      toast.error(error.message || 'Failed to update society');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateSociety = async`);

// Table header
content = content.replace('<th className="px-4 py-3 font-medium">Theme</th>',
`<th className="px-4 py-3 font-medium">Theme</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>`);

// Table cell
content = content.replace('</tr>\n                ))}  ', 
`</tr>
                ))}  `);
// Wait let's just use exact match and replace

fs.writeFileSync('../frontend/src/app/components/AdminSocietiesPage.tsx', content);
