const { resetStore } = require('../data/store');
const AuthService = require('../services/AuthService');
//Terminal command to run this test: npm test -- authService.test.js
describe('Registration', () => {
  beforeEach(() => {
    resetStore();
  });

  // Field validation 

  test('throws 400 when username is missing', () => {
    expect(() => AuthService.register({ password: 'secret123' }))
      .toThrow('username and password are required');
  });

  test('throws 400 when password is missing', () => {
    expect(() => AuthService.register({ username: 'alice' }))
      .toThrow('username and password are required');
  });

  test('throws 400 when both fields are empty strings', () => {
    expect(() => AuthService.register({ username: '', password: '' }))
      .toThrow('username and password are required');
  });

  test('throws 400 when role is not user or admin', () => {
    expect(() =>
      AuthService.register({ username: 'alice', password: 'pass', role: 'superuser' })
    ).toThrow('role must be user or admin');
  });

  // Successful registration 

  test('registers user with role user by default', () => {
    const user = AuthService.register({ username: 'alice', password: 'pass123' });

    expect(user).toMatchObject({ username: 'alice', role: 'user' });
    expect(typeof user.id).toBe('number');
  });

  test('registers admin when role is admin', () => {
    const admin = AuthService.register({
      username: 'adminBob',
      password: 'adminpass',
      role: 'admin'
    });

    expect(admin).toMatchObject({ username: 'adminBob', role: 'admin' });
  });

  test('does not return password in result', () => {
    const user = AuthService.register({ username: 'carol', password: 'mypassword' });

    expect(user).not.toHaveProperty('password');
  });

  test('assigns incrementing ids to new users', () => {
    const first = AuthService.register({ username: 'user1', password: 'pass' });
    const second = AuthService.register({ username: 'user2', password: 'pass' });

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  // Duplicate prevention

  test('throws 400 when username already exists', () => {
    AuthService.register({ username: 'dave', password: 'pass1' });

    expect(() => AuthService.register({ username: 'dave', password: 'pass2' }))
      .toThrow('username already exists');
  });

  test('allows different users with different usernames', () => {
    const a = AuthService.register({ username: 'eve', password: 'pass' });
    const b = AuthService.register({ username: 'frank', password: 'pass' });

    expect(a.id).not.toBe(b.id);
    expect(a.username).toBe('eve');
    expect(b.username).toBe('frank');
  });
});
