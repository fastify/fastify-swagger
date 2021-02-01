'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const fastifySwagger = require('../../../index')

test('support file in json schema', async t => {
  const opts7 = {
    schema: {
      consumes: ['application/x-www-form-urlencoded'],
      body: {
        type: 'object',
        properties: {
          hello: {
            description: 'hello',
            type: 'string',
            contentEncoding: 'binary'
          }
        },
        required: ['hello']
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opts7, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.same(definedPath.parameters, [{
    in: 'formData',
    name: 'hello',
    description: 'hello',
    required: true,
    type: 'file'
  }])
})

test('support response description', async t => {
  const opts8 = {
    schema: {
      response: {
        200: {
          description: 'Response OK!',
          type: 'object'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opts8, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, 'Response OK!')
})

test('response default description', async t => {
  const opts9 = {
    schema: {
      response: {
        200: {
          type: 'object'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opts9, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, 'Default Response')
})

test('response 2xx', async t => {
  const opt = {
    schema: {
      response: {
        '2xx': {
          type: 'object'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, 'Default Response')
  t.notOk(definedPath.responses['2XX'])
})

test('response conflict 2xx and 200', async t => {
  const opt = {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          description: '2xx'
        },
        200: {
          type: 'object',
          description: '200'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, '200')
  t.notOk(definedPath.responses['2XX'])
})

test('support status code 204', async t => {
  const opt = {
    schema: {
      response: {
        204: {
          type: 'null',
          description: 'No Content'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['204'].description, 'No Content')
  t.notOk(definedPath.responses['204'].schema)
})

test('support response headers', async t => {
  const opt = {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          },
          headers: {
            'X-WORLD': {
              type: 'string'
            }
          }
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].headers, opt.schema.response['200'].headers)
  t.notOk(definedPath.responses['200'].schema.headers)
})
