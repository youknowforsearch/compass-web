'use strict';

const { getSessionUser } = require('./session-user');

/**
 * @param {string} prefix
 */
function createPublicPathChecker(prefix) {
  return (url) => {
    const path = url.split('?')[0];
    return (
      path === '/healthz' ||
      path.startsWith(`${prefix}/auth/`) ||
      /\.(svg|ico|png|jpe?g|gif|css|js|map|woff2?|ttf|eot)$/.test(path)
    );
  };
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {string} prefix
 */
function registerAuthGuard(fastify, prefix) {
  const isPublicPath = createPublicPathChecker(prefix);

  fastify.addHook('onRequest', async (req, reply) => {
    if (isPublicPath(req.url)) {
      return;
    }

    if (getSessionUser(req)) {
      return;
    }

    const wantsHtml = (req.headers.accept || '').includes('text/html');
    if (!wantsHtml) {
      reply.code(401).send({ error: 'Unauthenticated' });
      return;
    }

    const returnTo = encodeURIComponent(req.url);
    reply.redirect(`${prefix}/auth/login?returnTo=${returnTo}`);
  });
}

module.exports = { registerAuthGuard, createPublicPathChecker };
