const fs = require('fs');
let file = fs.readFileSync('./frontend/src/app/components/StudentFeedbackPage.tsx', 'utf8');

if (!file.includes('import { supabase }')) {
  file = file.replace("import { useNavigate } from 'react-router';", "import { useNavigate } from 'react-router';\nimport { supabase } from '../../lib/supabase';\nimport { useAuthStore } from '../../store/authStore';");
}
if (!file.includes('const { user } = useAuthStore()')) {
  file = file.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n  const { user } = useAuthStore();');
}

let handleCode = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !message || !rating) {
      toast.error('Please fill out all fields');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setLoading(true);
    
    try {
      // Map string rating to integer
      let ratingInt = 3;
      if (rating === 'bad') ratingInt = 1;
      else if (rating === 'okay') ratingInt = 2;
      
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        category: category,
        message: message,
        rating: ratingInt,
        status: 'new'
      });
      
      if (error) throw error;
      
      toast.success('Feedback sent successfully. Thanks!');
      navigate('/student/settings');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send feedback');
    } finally {
      setLoading(false);
    }
  };`;
  
file = file.replace(/  const handleSubmit = async.*?1000\);\n  };/s, handleCode);

fs.writeFileSync('./frontend/src/app/components/StudentFeedbackPage.tsx', file);
