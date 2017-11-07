'use strict'

const fp = require('fastify-plugin')
const readFileSync = require('fs').readFileSync
const resolve = require('path').resolve

const files = {
  html: readFileSync(resolve('static', 'index.html'), 'utf8'),
  css: readFileSync(resolve('static', 'swagger-ui.css'), 'utf8'),
  js: readFileSync(resolve('static', 'swagger-ui-bundle.js'), 'utf8'),
  preset: readFileSync(resolve('static', 'swagger-ui-standalone-preset.js'), 'utf8')
}

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
      return reply.type('text/html').send(files.html)
    }

    switch (req.params.file) {
      case '':
        return reply.type('text/html').send(files.html)

      case 'swagger-ui.css':
        return reply.type('text/css').send(files.css)

      case 'swagger-ui-bundle.js':
        return reply.type('application/javascript').send(files.js)

      case 'swagger-ui-standalone-preset.js':
        return reply.type('application/javascript').send(files.preset)

      default:
        return reply.code(404).send(new Error('Not found'))
    }
  }

  next()
}

module.exports = fp(fastifySwagger, '>=0.14.0')
