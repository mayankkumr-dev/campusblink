const professorOnlyMiddleware = (req, res, next) => {
  const rawRole = req.profile?.role || req.user?.user_metadata?.role || req.user?.role || '';
  const role = String(rawRole).toLowerCase().trim();

  if (role !== 'professor' && role !== 'faculty' && role !== 'admin') {
    return res.status(403).json({ error: 'Professor access required' });
  }

  const status = req.profile?.professor_status || req.user?.user_metadata?.professor_status;
  if (status && status === 'rejected') {
    return res.status(403).json({ error: 'Professor account not approved' });
  }

  next();
};

module.exports = professorOnlyMiddleware;
