'use strict'

const fastify = require('fastify')()

fastify.register(require('./index'), {
  info: {
    title: 'Test swagger',
    description: 'testing the fastify swagger api',
    version: '0.1.0'
  },
  host: 'localhost',
  schemes: ['http']
})

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  },
  querystring: {
    hello: { type: 'string' },
    world: { type: 'string' }
  }
}

const otherSchema = {
  payload: {
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
  }
}

const params = {
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'user id'
      }
    }
  }
}

fastify.get('/', () => {})
fastify.post('/', () => {})
fastify.get('/example', schema, () => {})
fastify.post('/example', otherSchema, () => {})
fastify.get('/parameters/:id', params, () => {})

fastify.ready(err => {
  if (err) throw err
  fastify.swagger()
})
