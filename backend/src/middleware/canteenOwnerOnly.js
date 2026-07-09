const canteenOwnerOnlyMiddleware = (req, res, next) => {
  if (!req.profile || req.profile.role !== 'canteen_owner') {
    return res.status(403).json({ error: 'Canteen owner access required' });
  }
  next();
};

module.exports = canteenOwnerOnlyMiddleware;
