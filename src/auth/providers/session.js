'use strict';

const fp = require('fastify-plugin');
const client = require('openid-client');
const { getSessionUser } = require('../session-user');

/**
 * Shared session routes: login page, logout, and current user.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ prefix: string, auth: import('../index').AuthConfig }} opts
 */
async function registerSessionRoutes(fastify, { prefix, auth }) {
  fastify.get(`${prefix}/auth/login`, async (req, reply) => {
    if (getSessionUser(req)) {
      reply.redirect(`${prefix}/`);
      return;
    }

    const returnTo =
      typeof req.query.returnTo === 'string' ? req.query.returnTo : `${prefix}/`;
    const error =
      typeof req.query.error === 'string' ? req.query.error : undefined;

    reply.view('login.eta', {
      appName: fastify.args.appName,
      baseRoute: fastify.args.baseRoute,
      returnTo,
      error,
      oidcLoginUrl: `${prefix}/auth/login/oidc?returnTo=${encodeURIComponent(returnTo)}`,
    });
  });

  fastify.get(`${prefix}/auth/logout`, async (req, reply) => {
    const user = getSessionUser(req);
    const idToken = req.session.get('id_token');
    req.session.delete();

    if (user?.provider === 'oidc' && fastify.oidcConfig && idToken) {
      try {
        const endSessionUrl = client.buildEndSessionUrl(fastify.oidcConfig, {
          id_token_hint: idToken,
          post_logout_redirect_uri: auth.oidc.postLogoutRedirectUri,
        });
        reply.redirect(endSessionUrl.href);
        return;
      } catch (_err) {
        // Issuer has no end_session_endpoint configured.
      }
    }

    reply.redirect(`${prefix}/auth/login`);
  });

  fastify.get(`${prefix}/auth/me`, async (req, reply) => {
    const user = getSessionUser(req);
    if (!user) {
      reply.code(401).send({ error: 'Unauthenticated' });
      return;
    }
    reply.send({ user });
  });
}

module.exports = fp(registerSessionRoutes, { name: 'auth-session' });
