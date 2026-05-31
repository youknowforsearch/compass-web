'use strict';

/**
 * @typedef {{ id: string, username: string, name?: string, email?: string, roles: string[], provider: 'oidc' }} SessionUser
 */

/**
 * @param {import('fastify').FastifyRequest} req
 * @returns {SessionUser | null}
 */
function getSessionUser(req) {
  return req.session.get('user') ?? null;
}

/**
 * @param {import('fastify').FastifyRequest} req
 * @param {SessionUser} user
 */
function setSessionUser(req, user) {
  req.session.set('user', user);
}

/**
 * @param {SessionUser | null | undefined} user
 * @param {string} role
 */
function hasRole(user, role) {
  return Boolean(user?.roles?.includes(role));
}

module.exports = { getSessionUser, setSessionUser, hasRole };
