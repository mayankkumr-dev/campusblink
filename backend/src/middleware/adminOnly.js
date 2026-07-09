const adminOnlyMiddleware = (req, res, next) => {
  const isAdminEmail = req.user && req.user.email === 'contactus.mayank@gmail.com';
  
  if (!isAdminEmail && (!req.profile || req.profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = adminOnlyMiddleware;
