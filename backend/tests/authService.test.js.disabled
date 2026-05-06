const { resetStore } = require('../data/store');
const AuthService = require('../services/AuthService');

describe('AuthService - additional registration tests', () => {
  beforeEach(() => {
    resetStore();
  });

  test('registers user when explicit role is user', () => {
    const user = AuthService.register({
      username: 'userA',
      password: 'secret123',
      role: 'user'
    });

    expect(user).toMatchObject({
      username: 'userA',
      role: 'user'
    });
  });

  test('throws when username is null', () => {
    expect(() =>
      AuthService.register({ username: null, password: 'secret123' })
    ).toThrow('username and password are required');
  });

  test('throws when password is null', () => {
    expect(() =>
      AuthService.register({ username: 'alice', password: null })
    ).toThrow('username and password are required');
  });

  test('throws when username is undefined', () => {
    expect(() =>
      AuthService.register({ password: 'secret123' })
    ).toThrow('username and password are required');
  });

  test('throws when password is undefined', () => {
    expect(() =>
      AuthService.register({ username: 'alice' })
    ).toThrow('username and password are required');
  });

  test('user object includes id, username, and role only', () => {
    const user = AuthService.register({
      username: 'cleanUser',
      password: 'verysecret',
      role: 'user'
    });

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('username', 'cleanUser');
    expect(user).toHaveProperty('role', 'user');
    expect(user).not.toHaveProperty('password');
  });

  test('duplicate username check works after multiple successful registrations', () => {
    AuthService.register({ username: 'alice', password: 'pass1' });
    AuthService.register({ username: 'bob', password: 'pass2' });

    expect(() =>
      AuthService.register({ username: 'alice', password: 'anotherpass' })
    ).toThrow('username already exists');
  });

  test('admin and user usernames must both still be unique', () => {
    AuthService.register({ username: 'sam', password: 'pass1', role: 'admin' });

    expect(() =>
      AuthService.register({ username: 'sam', password: 'pass2', role: 'user' })
    ).toThrow('username already exists');
  });

  test('ids continue increasing across mixed roles', () => {
    const user = AuthService.register({ username: 'u1', password: 'pass', role: 'user' });
    const admin = AuthService.register({ username: 'a1', password: 'pass', role: 'admin' });
    const user2 = AuthService.register({ username: 'u2', password: 'pass', role: 'user' });

    expect(user.id).toBe(1);
    expect(admin.id).toBe(2);
    expect(user2.id).toBe(3);
  });
});