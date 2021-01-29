'use strict'

const fp = require('fastify-plugin')

function fastifySwagger (fastify, opts, next) {
  // by default the mode is dynamic, as plugin initially was developed
  opts.mode = opts.mode || 'dynamic'

  switch (opts.mode) {
    case 'static': {
      const setup = require('./lib/mode/static')
      setup(fastify, opts, next)
      break
    }
    case 'dynamic': {
      const setup = require('./lib/mode/dynamic')
      setup(fastify, opts, next)
      break
    }
    default: {
      return next(new Error("unsupported mode, should be one of ['static', 'dynamic']"))
    }
  }

  fastify.decorate('swaggerCSP', require('./static/csp.json'))
}

module.exports = fp(fastifySwagger, {
  fastify: '>=3.x',
  name: 'fastify-swagger'
})
