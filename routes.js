'use strict'

const fp = require('fastify-plugin')
const readFileSync = require('fs').readFileSync
const resolve = require('path').resolve

const files = {
  'index.html': {type: 'text/html'},
  'swagger-ui.css': {type: 'text/css'},
  'swagger-ui.css.map': {type: 'application/json'},
  'swagger-ui-bundle.js': {type: 'application/javascript'},
  'swagger-ui-bundle.js.map': {type: 'application/json'},
  'swagger-ui-standalone-preset.js': {type: 'application/javascript'},
  'swagger-ui-standalone-preset.js.map': {type: 'application/json'}
}
Object.keys(files).forEach(filename => {
  files[filename].contents = readFileSync(resolve(__dirname, 'static', filename), 'utf8')
})

function fastifySwagger (fastify, opts, next) {
  fastify.route({
    url: '/documentation/json',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply.send(fastify.swagger())
    }
  })

  fastify.route({
    url: '/documentation/yaml',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply
        .type('application/x-yaml')
        .send(fastify.swagger({ yaml: true }))
    }
  })

  fastify.route({
    url: '/documentation',
    method: 'GET',
    schema: { hide: true },
    handler: sendStaticFiles
  })

  fastify.route({
    url: '/documentation/:file',
    method: 'GET',
    schema: { hide: true },
    handler: sendStaticFiles
  })

  function sendStaticFiles (req, reply) {
    if (!req.params.file) {
      const file = files['index.html']
      reply.type(file.type).send(file.contents)
    } else if (files.hasOwnProperty(req.params.file)) {
      const file = files[req.params.file]
      reply.type(file.type).send(file.contents)
    } else {
      return reply.code(404).send(new Error('Not found'))
    }
  }

  next()
}

module.exports = fp(fastifySwagger, '>=0.14.0')
