/**
 * RBAC middleware — checks if user has at least one of the required roles.
 * Usage: roles('admin') or roles('venue_owner', 'admin')
 */
const roles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = roles;
