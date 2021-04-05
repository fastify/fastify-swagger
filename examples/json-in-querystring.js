'use strict'

const qs = require('qs')
const fastify = require('fastify')({
  querystringParser: (str) => {
    const result = qs.parse(str)

    if (result.filter && typeof result.filter === 'string') {
      result.filter = JSON.parse(result.filter)
    }

    return result
  }
})

fastify.register(require('../index'), {
  openapi: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    }
  },
  exposeRoute: true
})

fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    querystring: {
      type: 'object',
      required: ['filter'],
      additionalProperties: false,
      properties: {
        filter: {
          type: 'object',
          required: ['foo'],
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' }
          },
          'x-consume': 'application/json'
        }
      }
    }
  },
  handler (request, reply) {
    reply.send(request.query.filter)
  }
})

fastify.listen(3000, (err, addr) => {
  if (err) throw err
  console.log(`listening on ${addr}`)
})
