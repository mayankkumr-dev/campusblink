const professorOnlyMiddleware = (req, res, next) => {
  if (!req.profile || req.profile.role !== 'professor') {
    return res.status(403).json({ error: 'Professor access required' });
  }
  
  if (req.profile.professor_status !== 'approved') {
    return res.status(403).json({ error: 'Professor account not approved' });
  }
  
  next();
};

module.exports = professorOnlyMiddleware;
