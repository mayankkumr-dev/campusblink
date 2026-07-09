const adminOnlyMiddleware = (req, res, next) => {
  const isAdminEmail = req.user && (process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) ?? []).includes(String(req.user.email || '').toLowerCase());
  
  if (!isAdminEmail && (!req.profile || req.profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = adminOnlyMiddleware;
