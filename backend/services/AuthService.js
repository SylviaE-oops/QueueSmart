const { addUser, getUserByUsername, getUserById } = require('../data/store');
const { createHttpError } = require('./errors');

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

function register(payload) {
  const { username, password, role = 'user' } = payload;

  if (!username || !password) {
    throw createHttpError(400, 'username and password are required');
  }

  if (role !== 'user' && role !== 'admin') {
    throw createHttpError(400, 'role must be user or admin');
  }

  if (getUserByUsername(username)) {
    throw createHttpError(400, 'username already exists');
  }

  const user = addUser({ username, password, role });
  return sanitizeUser(user);
}

function login(payload) {
  const { username, password } = payload;

  if (!username || !password) {
    throw createHttpError(400, 'username and password are required');
  }

  const user = getUserByUsername(username);
  if (!user || user.password !== password) {
    throw createHttpError(401, 'invalid credentials crack');
  }

  return {
    user: sanitizeUser(user),
    token: `mock-token-${user.id}`
  };
}

function getUserFromHeader(userId) {
  if (!userId) {
    throw createHttpError(401, 'missing x-user-id header');
  }

  const parsed = Number(userId);
  if (Number.isNaN(parsed)) {
    throw createHttpError(401, 'x-user-id must be numeric');
  }

  const user = getUserById(parsed);
  if (!user) {
    throw createHttpError(401, 'user not found');
  }

  return sanitizeUser(user);
}

module.exports = {
  register,
  login,
  getUserFromHeader
};
