import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { adminAPI } from '../../api/admin';
import { uploadImage } from '../../lib/cloudinary';
import { Building2, Plus, Mail, Lock, User, Palette, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

type SocietyFormData = {
  name: string;
  username: string;
  college: string;
  theme_color: string;
  bio: string;
  avatar_url?: string;
};

export const AdminSocietiesPage = () => {
  const { user } = useAuthStore();
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: '',
    college: user?.college || '',
    theme_color: '#0F172A',
    bio: '',
  });

  const [editFormData, setEditFormData] = useState<SocietyFormData>({
    name: '',
    username: '',
    college: '',
    theme_color: '#0F172A',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    fetchSocieties();
  }, []);

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getSocieties();
      setSocieties(data);
    } catch (error) {
      console.error('Error fetching societies:', error);
      toast.error('Failed to load societies');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (society: any) => {
    setEditingId(society.id);
    setEditFormData({
      name: society.name || '',
      username: society.username || '',
      college: society.college || '',
      theme_color: society.theme_color || '#0F172A',
      bio: society.bio || '',
      avatar_url: society.avatar_url || '',
    });
    setImageFile(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingId(null);
    setImageFile(null);
  };

  const handleUpdateSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) {
      toast.error('No society selected');
      return;
    }

    if (!editFormData.name || !editFormData.username) {
      toast.error('Name and username are required');
      return;
    }

    try {
      setUpdating(true);
      const dataToSubmit: SocietyFormData = {
        ...editFormData,
        username: editFormData.username.replace('@', '').trim().toLowerCase(),
      };

      if (imageFile) {
        const url = await uploadImage(imageFile, 'avatars');
        if (url) {
          dataToSubmit.avatar_url = url;
        }
      }

      await adminAPI.updateSocietyUser(editingId, dataToSubmit);
      toast.success('Society updated successfully!');
      closeEditModal();
      await fetchSocieties();
    } catch (error: any) {
      console.error('Error updating society:', error);
      toast.error(error?.message || 'Failed to update society');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.username) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await adminAPI.createSocietyUser({
        ...formData,
        username: formData.username.trim().toLowerCase(),
      });
      toast.success('Society created successfully!');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        name: '',
        username: '',
        college: user?.college || '',
        theme_color: '#0F172A',
        bio: '',
      });
      await fetchSocieties();
    } catch (error: any) {
      console.error('Error creating society:', error);
      toast.error(error?.message || 'Failed to create society');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Societies</h2>
          <p className="text-sm text-slate-500">Manage student societies and organizations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-black/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Society
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading societies...</div>
      ) : societies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-black/[0.08]">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3 dark:text-slate-400 transition-colors" />
          <h3 className="font-semibold text-slate-900">No Societies Found</h3>
          <p className="text-sm text-slate-500">Create your first society account to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-black/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F5F7] border-b border-black/[0.08] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Society</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">College</th>
                  <th className="px-4 py-3 font-medium">Theme</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.08]">
                {societies.map((society) => (
                  <tr key={society.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F7] border border-black/[0.08] flex items-center justify-center overflow-hidden">
                          {society.avatar_url ? (
                            <img src={society.avatar_url} alt={society.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-colors" />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{society.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">@{society.username}</td>
                    <td className="px-4 py-3 text-slate-500">{society.email}</td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{society.college}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-black/[0.08]"
                          style={{ backgroundColor: society.theme_color || '#0F172A' }}
                        />
                        <span className="text-slate-500">{society.theme_color || '#0F172A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(society)}
                        className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-[#F5F5F7]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-black/[0.08] flex justify-between items-center">
              <h3 className="font-semibold text-lg">Create Society Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSociety} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Society Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                    placeholder="e.g. Computer Science Club"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-500 dark:text-slate-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                    }
                    className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                    placeholder="cs_club"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                    placeholder="society@college.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                    placeholder="Min. 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Brand Theme Color</label>
                <div className="relative flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.theme_color}
                    onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                    className="w-10 h-10 p-1 rounded-lg border-none cursor-pointer"
                  />
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Palette className="h-4 w-4 text-slate-500 dark:text-slate-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.theme_color}
                      onChange={(e) => setFormData({ ...formData, theme_color: e.target.value.toUpperCase() })}
                      className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all uppercase"
                      placeholder="#0F172A"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Bio (Optional)</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all resize-none h-20"
                  placeholder="Short description of the society..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black/80 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Society'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-black/[0.08] flex justify-between items-center">
              <h3 className="font-semibold text-lg">Edit Society</h3>
              <button onClick={closeEditModal} className="text-slate-500 hover:text-slate-900 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSociety} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Society Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={editFormData.username}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, '') })
                  }
                  className="w-full px-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">College</label>
                <input
                  type="text"
                  value={editFormData.college}
                  onChange={(e) => setEditFormData({ ...editFormData, college: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editFormData.theme_color}
                    onChange={(e) => setEditFormData({ ...editFormData, theme_color: e.target.value })}
                    className="w-10 h-10 p-1 rounded-lg border-none cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editFormData.theme_color}
                    onChange={(e) => setEditFormData({ ...editFormData, theme_color: e.target.value.toUpperCase() })}
                    className="flex-1 px-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all uppercase"
                    placeholder="#0F172A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Bio (About)</label>
                <textarea
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F5F5F7] border-none rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all resize-none h-24"
                  placeholder="Short description of the society..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Society Avatar</label>
                <div className="mt-2 flex items-center gap-3">
                  {(editFormData.avatar_url || imageFile) && (
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : editFormData.avatar_url}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover border border-black/10"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                    className="text-sm text-slate-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black/80 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};