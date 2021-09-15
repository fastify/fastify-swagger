'use strict'

const { addHook, resolveSwaggerFunction } = require('../util/common')

module.exports = function (fastify, opts, done) {
  opts = Object.assign({}, {
    exposeRoute: false,
    hiddenTag: 'X-HIDDEN',
    hideUntagged: false,
    stripBasePath: true,
    openapi: null,
    swagger: {},
    transform: null,
    refResolver: {
      buildLocalReference (json, baseUri, fragment, i) {
        if (!json.title && json.$id) {
          json.title = json.$id
        }
        return `def-${i}`
      }
    }
  }, opts)

  const { routes, Ref } = addHook(fastify, opts)

  if (opts.exposeRoute === true) {
    const prefix = opts.routePrefix || '/documentation'
    const uiConfig = opts.uiConfig || {}
    const initOAuth = opts.initOAuth || {}
    const staticCSP = opts.staticCSP
    const transformStaticCSP = opts.transformStaticCSP
    fastify.register(require('../routes'), {
      prefix,
      uiConfig,
      initOAuth,
      staticCSP,
      transformStaticCSP,
      hooks: opts.uiHooks
    })
  }

  const cache = {
    object: null,
    string: null
  }

  const swagger = resolveSwaggerFunction(opts, cache, routes, Ref, done)
  fastify.decorate('swagger', swagger)

  done()
}
