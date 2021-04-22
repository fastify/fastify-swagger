'use strict'

const fastify = require('fastify')()

fastify.register(require('../index'), {
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json']
  },
  hideUntagged: true,
  exposeRoute: true
})

fastify.put('/some-route/:id', {
  schema: {
    description: 'post some data',
    tags: ['user', 'code'],
    summary: 'qwerty',
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'user id'
        }
      }
    },
    body: {
      type: 'object',
      properties: {
        hello: { type: 'string' },
        obj: {
          type: 'object',
          properties: {
            some: { type: 'string' }
          }
        }
      }
    },
    response: {
      201: {
        description: 'Succesful response',
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
}, (req, reply) => { reply.send({ hello: `Hello ${req.body.hello}` }) })

fastify.post('/some-route/:id', {
  schema: {
    description: 'post some data',
    summary: 'qwerty',
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'user id'
        }
      }
    },
    body: {
      type: 'object',
      properties: {
        hello: { type: 'string' },
        obj: {
          type: 'object',
          properties: {
            some: { type: 'string' }
          }
        }
      }
    },
    response: {
      201: {
        description: 'Succesful response',
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
}, (req, reply) => { reply.send({ hello: `Hello ${req.body.hello}` }) })

fastify.listen(3000, err => {
  if (err) throw err
  console.log('listening')
})
