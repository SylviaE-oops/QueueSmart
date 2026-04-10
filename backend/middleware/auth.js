const AuthService = require('../services/AuthService');
const { createHttpError } = require('../services/errors');

async function authenticate(req, res, next) {
  try {
    const user = await AuthService.getUserFromHeader(req.header('x-user-id'));
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(createHttpError(401, 'admin access required'));
  }
  return next();
}

module.exports = {
  authenticate,
  authorizeAdmin
};
