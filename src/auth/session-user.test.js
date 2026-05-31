'use strict';

const assert = require('assert');
const { getSessionUser, setSessionUser, hasRole } = require('./session-user');

function mockRequest(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    session: {
      get(key) {
        return store.has(key) ? store.get(key) : undefined;
      },
      set(key, value) {
        if (value === undefined) {
          store.delete(key);
        } else {
          store.set(key, value);
        }
      },
      delete() {
        store.clear();
      },
    },
  };
}

describe('session-user', () => {
  it('getSessionUser returns null when no user is stored', () => {
    const req = mockRequest();
    assert.strictEqual(getSessionUser(req), null);
  });

  it('setSessionUser stores and getSessionUser retrieves the user', () => {
    const req = mockRequest();
    const user = {
      id: 'user-1',
      username: 'alice',
      name: 'Alice',
      email: 'alice@example.com',
      roles: ['user'],
      provider: 'oidc',
    };

    setSessionUser(req, user);
    assert.deepStrictEqual(getSessionUser(req), user);
  });

  it('hasRole returns true when the user has the role', () => {
    const user = { roles: ['user', 'admin'] };
    assert.strictEqual(hasRole(user, 'admin'), true);
  });

  it('hasRole returns false when the user lacks the role', () => {
    const user = { roles: ['user'] };
    assert.strictEqual(hasRole(user, 'admin'), false);
  });

  it('hasRole returns false for null or undefined users', () => {
    assert.strictEqual(hasRole(null, 'user'), false);
    assert.strictEqual(hasRole(undefined, 'user'), false);
  });
});
