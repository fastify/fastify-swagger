'use strict'

const path = require('path')
const fs = require('fs')

// URI prefix to separate static assets for swagger UI
const staticPrefix = '/static'

function fastifySwagger (fastify, opts, next) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: { hide: true },
    handler: (request, reply) => {
      if (fastify.prefix === '/') {
        reply.redirect(`${staticPrefix}/index.html`)
      } else {
        reply.redirect(`${fastify.prefix}${staticPrefix}/index.html`)
      }
    }
  })

  fastify.route({
    url: '/json',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply.send(fastify.swagger())
    }
  })

  fastify.route({
    url: '/yaml',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply
        .type('application/x-yaml')
        .send(fastify.swagger({ yaml: true }))
    }
  })

  // serve swagger-ui with the help of fastify-static
  fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'static'),
    prefix: staticPrefix
  })

  // Handler for external documentation files passed via $ref
  fastify.route({
    url: '/*',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      const file = req.params['*']
      if (file === '') {
        reply.redirect(302, `${fastify.basePath}${staticPrefix}/index.html`)
      } else if (opts.baseDir) {
        const filePath = `${opts.baseDir}/${file}`

        const ext = path.extname(file).toLocaleLowerCase()
        if (!fs.existsSync(filePath) || ['.yaml', '.json'].indexOf(ext) === -1) {
          return reply.code(404).send()
        }

        const contentType = ext === '.yaml' ? 'application/x-yaml' : 'application/json'
        reply
          .type(contentType)
          .send(fs.readFileSync(filePath))
      } else {
        reply.code(404).send()
      }
    }
  })

  next()
}

module.exports = fastifySwagger
