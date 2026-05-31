'use strict';

const fp = require('fastify-plugin');
const { registerAuthGuard } = require('./guard');

/**
 * @typedef {object} AuthConfig
 * @property {boolean} enabled
 * @property {boolean} sessionRequired
 * @property {string} sessionSecret
 * @property {object} oidc
 */

/**
 * Registers OIDC session authentication and legacy Basic Auth fallback.
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
async function authPlugin(fastify) {
  const { auth, baseRoute } = fastify.args;

  if (!auth?.enabled) {
    registerLegacyBasicAuth(fastify);
    return;
  }

  const prefix = baseRoute ? `/${baseRoute}` : '';

  fastify.register(require('@fastify/secure-session'), {
    secret: auth.sessionSecret,
    salt: 'compass-web-salt',
    cookieName: 'cw_session',
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
    },
  });

  await fastify.register(require('./providers/session'), { prefix, auth });
  await fastify.register(require('./providers/oidc'), {
    prefix,
    oidc: auth.oidc,
  });

  registerAuthGuard(fastify, prefix);

  fastify.log.info(`OIDC authentication enabled (issuer: ${auth.oidc.issuer})`);
}

/**
 * Legacy HTTP Basic Auth (API routes only). Used when OIDC is not configured.
 * @param {import('fastify').FastifyInstance} fastify
 */
function registerLegacyBasicAuth(fastify) {
  const basicAuth = fastify.args.basicAuth;
  if (!basicAuth) {
    return;
  }

  fastify.register(require('@fastify/basic-auth'), {
    validate: (username, password, _req, _reply, done) => {
      if (
        username === basicAuth.username &&
        password === basicAuth.password
      ) {
        done();
      } else {
        done(new Error('Authentication error'));
      }
    },
    authenticate: true,
  });
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
function registerAuth(fastify) {
  fastify.register(fp(authPlugin, { name: 'compass-auth' }));
}

module.exports = { registerAuth };
