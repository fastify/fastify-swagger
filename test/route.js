'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
const fastifySwagger = require('../index')

const swaggerInfo = {
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    host: 'localhost',
    schemes: ['http']
  }
}

const opts1 = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    querystring: {
      hello: { type: 'string' },
      world: { type: 'string' }
    }
  }
}

const opts2 = {
  schema: {
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
      },
      required: ['hello']
    }
  }
}

const opts3 = {
  schema: {
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
}

test('/documentation route, json response', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation'
  }, res => {
    var payload = JSON.parse(res.payload)

    Swagger.validate(payload)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('fastify.swagger should return a valid swagger yaml', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation?yaml=true'
  }, res => {
    t.is(typeof res.payload, 'string')
    t.is(res.headers['content-type'], 'text/plain')
    try {
      yaml.safeLoad(res.payload)
      t.pass('valid swagger yaml')
    } catch (err) {
      t.fail(err)
    }
  })
})
