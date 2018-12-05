'use strict'

const fp = require('fastify-plugin')

const setup = { dynamic: require('./dynamic'), static: require('./static') }

function fastifySwagger (fastify, opts, next) {
  opts = opts || {}

  // by default the mode is dynamic, as plugin initially was developed
  opts.mode = opts.mode || 'dynamic'

  switch (opts.mode) {
    case 'static':
      setup.static(fastify, opts, next)
      break
    case 'dynamic':
      setup.dynamic(fastify, opts, next)
      break
    default:
      return next(new Error("unsupported mode, should be one of ['static', 'dynamic']"))
  }
}

module.exports = fp(fastifySwagger, {
  fastify: '>=2.0.0',
  name: 'fastify-swagger'
})
