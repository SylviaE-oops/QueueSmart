const AuthService = require('../services/AuthService');

async function register(req, res, next) {
  try {
    const user = await AuthService.register(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const loginResult = await AuthService.login(req.body);
    return res.status(200).json(loginResult);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login
};
