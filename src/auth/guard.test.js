'use strict';

const assert = require('assert');
const { createPublicPathChecker } = require('./guard');

describe('createPublicPathChecker', () => {
  it('allows health checks without authentication', () => {
    const isPublic = createPublicPathChecker('');
    assert.strictEqual(isPublic('/healthz'), true);
  });

  it('allows auth routes without authentication', () => {
    const isPublic = createPublicPathChecker('');
    assert.strictEqual(isPublic('/auth/login'), true);
    assert.strictEqual(isPublic('/auth/login?returnTo=%2F'), true);
    assert.strictEqual(isPublic('/auth/login/oidc'), true);
    assert.strictEqual(isPublic('/auth/callback'), true);
    assert.strictEqual(isPublic('/auth/logout'), true);
    assert.strictEqual(isPublic('/auth/me'), true);
  });

  it('allows static asset paths without authentication', () => {
    const isPublic = createPublicPathChecker('');
    assert.strictEqual(isPublic('/app.js'), true);
    assert.strictEqual(isPublic('/styles/main.css'), true);
    assert.strictEqual(isPublic('/favicon.ico'), true);
    assert.strictEqual(isPublic('/fonts/icon.woff2'), true);
  });

  it('requires authentication for API and app routes', () => {
    const isPublic = createPublicPathChecker('');
    assert.strictEqual(isPublic('/api/connections'), false);
    assert.strictEqual(isPublic('/protected'), false);
  });

  it('honors the base route prefix for auth paths', () => {
    const isPublic = createPublicPathChecker('/compass');
    assert.strictEqual(isPublic('/compass/auth/login'), true);
    assert.strictEqual(isPublic('/auth/login'), false);
    assert.strictEqual(isPublic('/compass/api/connections'), false);
  });
});
