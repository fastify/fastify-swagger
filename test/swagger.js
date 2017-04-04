'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
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

test('fastify.swagger should exist', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger)

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.swagger)
  })
})

test('fastify.swagger should return a valid swagger file', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts1 = {
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

  const opts2 = {
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

  const opts3 = {
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
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger({
      json: true,
      return: true
    })

    Swagger.validate(swaggerObject)
      .then(function (api) {
        t.pass()
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('fastify.swagger basic properties', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
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

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger({
      json: true,
      return: true
    })

    t.equal(swaggerObject.info, swaggerInfo.swagger.info)
    t.equal(swaggerObject.host, swaggerInfo.swagger.host)
    t.equal(swaggerObject.schemes, swaggerInfo.swagger.schemes)
    t.ok(swaggerObject.paths)
    t.ok(swaggerObject.paths['/'])
  })
})
