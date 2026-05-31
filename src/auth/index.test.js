'use strict';

const assert = require('assert');
const { registerAuth } = require('./index');

describe('registerAuth', () => {
  /** @type {import('fastify').FastifyInstance} */
  let app;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('registers legacy basic auth when OIDC is disabled', async () => {
    app = require('fastify')({ logger: false });
    app.decorate('args', {
      auth: null,
      basicAuth: { username: 'admin', password: 'secret' },
      baseRoute: '',
    });

    registerAuth(app);
    await app.ready();

    assert.ok(app.hasDecorator('basicAuth'));
    assert.strictEqual(app.hasDecorator('oidcConfig'), false);
  });

  it('does not register basic auth when credentials are absent', async () => {
    app = require('fastify')({ logger: false });
    app.decorate('args', {
      auth: null,
      basicAuth: null,
      baseRoute: '',
    });

    registerAuth(app);
    await app.ready();

    assert.strictEqual(app.hasDecorator('basicAuth'), false);
  });
});
