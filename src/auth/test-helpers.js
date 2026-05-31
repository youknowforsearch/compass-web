'use strict';

const path = require('path');
const { Eta } = require('eta');

const SESSION_SECRET = 'x'.repeat(32);

/** @type {string} */
let oidcState = 'test-state';

/** @type {Record<string, unknown>} */
let openIdClientOverrides = {};

/** @type {import('openid-client').TokenEndpointResponse} */
let mockTokenResponse = {
  claims: () => ({
    sub: 'user-1',
    preferred_username: 'alice',
    name: 'Alice',
    email: 'alice@example.com',
    groups: ['admins'],
  }),
  id_token: 'mock-id-token',
};

/** @type {import('openid-client').TokenEndpointResponse} */
function defaultTokenResponse() {
  return {
    claims: () => ({
      sub: 'user-1',
      preferred_username: 'alice',
      name: 'Alice',
      email: 'alice@example.com',
      groups: ['admins'],
    }),
    id_token: 'mock-id-token',
  };
}

function installOpenIdClientMock() {
  const openidClientPath = require.resolve('openid-client');

  const baseMock = {
    discovery: async () => ({
      serverMetadata: () => ({ supportsPKCE: () => true }),
    }),
    randomPKCECodeVerifier: () => 'test-verifier',
    calculatePKCECodeChallenge: async () => 'test-challenge',
    randomNonce: () => 'test-nonce',
    randomState: () => oidcState,
    buildAuthorizationUrl: (_config, parameters) =>
      new URL(`https://idp.example.com/auth?state=${parameters.state}`),
    authorizationCodeGrant: async () => mockTokenResponse,
    buildEndSessionUrl: (_config, parameters) =>
      new URL(
        `https://idp.example.com/logout?id_token_hint=${parameters.id_token_hint}`
      ),
  };

  require.cache[openidClientPath] = {
    id: openidClientPath,
    filename: openidClientPath,
    loaded: true,
    exports: { ...baseMock, ...openIdClientOverrides },
  };

  delete require.cache[require.resolve('./providers/oidc')];
  delete require.cache[require.resolve('./providers/session')];
}

/**
 * @param {{
 *   baseRoute?: string,
 *   oidc?: Record<string, unknown>,
 *   authEnabled?: boolean,
 *   openIdClientOverrides?: Record<string, unknown>,
 * }} [options]
 */
async function createAuthTestApp(options = {}) {
  openIdClientOverrides = options.openIdClientOverrides ?? {};
  installOpenIdClientMock();

  const { registerAuthGuard } = require('./guard');
  const sessionProvider = require('./providers/session');
  const oidcProvider = require('./providers/oidc');

  const baseRoute = options.baseRoute ?? '';
  const prefix = baseRoute ? `/${baseRoute}` : '';
  const authEnabled = options.authEnabled ?? true;

  const oidc = {
    issuer: 'https://idp.example.com',
    clientId: 'test-client',
    clientSecret: 'secret',
    scope: 'openid profile email',
    groupsClaim: 'groups',
    allowedGroups: null,
    postLogoutRedirectUri: 'https://app.example.com/auth/login',
    ...options.oidc,
  };

  const fastify = require('fastify')({ logger: false });

  fastify.decorate('args', {
    appName: 'Test App',
    baseRoute,
    auth: authEnabled
      ? {
          enabled: true,
          sessionRequired: true,
          sessionSecret: SESSION_SECRET,
          oidc,
        }
      : null,
    basicAuth: null,
  });

  await fastify.register(require('@fastify/secure-session'), {
    secret: SESSION_SECRET,
    salt: 'compass-web-salt',
    cookieName: 'cw_session',
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    },
  });

  await fastify.register(require('@fastify/view'), {
    engine: { eta: new Eta() },
    root: path.join(__dirname),
  });

  if (authEnabled) {
    await fastify.register(sessionProvider, {
      prefix,
      auth: fastify.args.auth,
    });
    await fastify.register(oidcProvider, { prefix, oidc });
    registerAuthGuard(fastify, prefix);
  }

  fastify.get('/healthz', async () => ({ status: 'ok' }));
  fastify.get(`${prefix}/protected`, async () => ({ ok: true }));

  await fastify.ready();
  return fastify;
}

/**
 * @param {import('fastify').FastifyInstance} app
 */
async function loginViaOidcCallback(app, prefix = '') {
  const start = await app.inject({
    method: 'GET',
    url: `${prefix}/auth/login/oidc`,
  });

  const cookie = start.headers['set-cookie'];
  const callback = await app.inject({
    method: 'GET',
    url: `${prefix}/auth/callback?code=test-code&state=${oidcState}`,
    headers: { cookie },
  });

  return {
    start,
    callback,
    cookie: callback.headers['set-cookie'] ?? cookie,
  };
}

function resetOidcTestState() {
  oidcState = 'test-state';
  openIdClientOverrides = {};
  mockTokenResponse = defaultTokenResponse();
  delete require.cache[require.resolve('./providers/oidc')];
  delete require.cache[require.resolve('./providers/session')];
  delete require.cache[require.resolve('openid-client')];
}

function setMockTokenClaims(claims) {
  mockTokenResponse = {
    claims: () => claims,
    id_token: 'mock-id-token',
  };
}

module.exports = {
  SESSION_SECRET,
  createAuthTestApp,
  loginViaOidcCallback,
  resetOidcTestState,
  setMockTokenClaims,
  setOidcState: (state) => {
    oidcState = state;
  },
};
