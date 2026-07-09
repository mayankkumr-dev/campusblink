const printShopOnlyMiddleware = (req, res, next) => {
  if (!req.profile || req.profile.role !== 'print_shop') {
    return res.status(403).json({ error: 'Print shop access required' });
  }
  next();
};

module.exports = printShopOnlyMiddleware;
