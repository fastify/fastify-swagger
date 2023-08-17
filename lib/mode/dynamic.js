'use strict'

const { addHook } = require('../util/add-hook')
const { resolveSwaggerFunction } = require('../util/resolve-swagger-function')

module.exports = function (fastify, opts, done) {
  opts = Object.assign({}, {
    exposeRoute: false,
    hiddenTag: 'X-HIDDEN',
    hideUntagged: false,
    stripBasePath: true,
    openapi: null,
    swagger: {},
    transform: null,
    transformObject: null,
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

  const cache = {
    object: null,
    string: null
  }

  const swagger = resolveSwaggerFunction(opts, cache, routes, Ref, done)
  fastify.decorate('swagger', swagger)

  done()
}
