'use strict';

const assert = require('assert');
const { readCliArgs } = require('./cli');

const originalArgv = process.argv;
const sessionSecret = 'x'.repeat(32);

function withArgv(args, fn) {
  process.argv = ['node', 'compass-web', ...args];
  try {
    return fn();
  } finally {
    process.argv = originalArgv;
  }
}

describe('readCliArgs OIDC auth', () => {
  it('leaves auth null when OIDC is not configured', () => {
    withArgv(['--mongo-uri', 'mongodb://localhost:27017'], () => {
      const args = readCliArgs();
      assert.strictEqual(args.auth, null);
    });
  });

  it('enables OIDC auth when issuer and client id are set', () => {
    withArgv(
      [
        '--oidc-issuer',
        'https://idp.example.com/realms/r',
        '--oidc-client-id',
        'compass-web',
        '--oidc-client-secret',
        'secret',
        '--session-secret',
        sessionSecret,
      ],
      () => {
        const args = readCliArgs();
        assert.ok(args.auth);
        assert.strictEqual(args.auth.oidc.issuer, 'https://idp.example.com/realms/r');
        assert.strictEqual(args.auth.oidc.clientId, 'compass-web');
      }
    );
  });

  it('throws when session-secret is missing for OIDC', () => {
    withArgv(
      [
        '--oidc-issuer',
        'https://idp.example.com',
        '--oidc-client-id',
        'cw',
      ],
      () => {
        assert.throws(() => readCliArgs(), /session-secret/);
      }
    );
  });

  it('throws when oidc-client-id is missing', () => {
    withArgv(['--oidc-issuer', 'https://idp.example.com'], () => {
      assert.throws(() => readCliArgs(), /oidc-client-id/);
    });
  });
});
