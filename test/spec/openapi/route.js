'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
const fastifySwagger = require('../../../index')
const {
  openapiOption,
  schemaBody,
  schemaConsumes,
  schemaCookies,
  schemaExtension,
  schemaHeaders,
  schemaHeadersParams,
  schemaParams,
  schemaProduces,
  schemaQuerystring,
  schemaSecurity,
  schemaOperationId
} = require('../../../examples/options')

test('openapi should return a valid swagger object', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/headers', schemaHeaders, () => {})
  fastify.get('/headers/:id', schemaHeadersParams, () => {})
  fastify.get('/security', schemaSecurity, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('openapi should return a valid swagger yaml', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/headers', schemaHeaders, () => {})
  fastify.get('/headers/:id', schemaHeadersParams, () => {})
  fastify.get('/security', schemaSecurity, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerYaml = fastify.swagger({ yaml: true })
    t.equal(typeof swaggerYaml, 'string')

    try {
      yaml.load(swaggerYaml)
      t.pass('valid swagger yaml')
    } catch (err) {
      t.fail(err)
    }
  })
})

test('route options - deprecated', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      deprecated: true,
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
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)
    const openapiObject = fastify.swagger()

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
        t.ok(openapiObject.paths['/'])
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - meta', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      operationId: 'doSomething',
      summary: 'Route summary',
      tags: ['tag'],
      description: 'Route description',
      servers: [
        {
          url: 'https://localhost'
        }
      ],
      externalDocs: {
        description: 'Find more info here',
        url: 'https://swagger.io'
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)
    const openapiObject = fastify.swagger()

    Swagger.validate(openapiObject)
      .then(function (api) {
        const definedPath = api.paths['/'].get
        t.ok(definedPath)
        t.equal(opts.schema.operationId, definedPath.operationId)
        t.equal(opts.schema.summary, definedPath.summary)
        t.same(opts.schema.tags, definedPath.tags)
        t.equal(opts.schema.description, definedPath.description)
        t.equal(opts.schema.servers, definedPath.servers)
        t.equal(opts.schema.externalDocs, definedPath.externalDocs)
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - produces', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', schemaProduces, () => {})

  fastify.ready(err => {
    t.error(err)
    const openapiObject = fastify.swagger()

    Swagger.validate(openapiObject)
      .then(function (api) {
        const definedPath = api.paths['/'].get
        t.ok(definedPath)
        t.same(definedPath.responses[200].content, {
          '*/*': {
            schema: {
              type: 'object',
              properties: {
                hello: {
                  description: 'hello',
                  type: 'string'
                }
              },
              required: ['hello']
            }
          }
        })
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - cookies', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', schemaCookies, () => {})

  fastify.ready(err => {
    t.error(err)
    const openapiObject = fastify.swagger()
    Swagger.validate(openapiObject)
      .then(function (api) {
        const definedPath = api.paths['/'].get
        t.ok(definedPath)
        t.same(definedPath.parameters, [
          {
            required: false,
            in: 'cookie',
            name: 'bar',
            schema: {
              type: 'string'
            }
          }
        ])
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - extension', t => {
  t.plan(5)
  const fastify = Fastify()
  fastify.register(fastifySwagger, { openapi: { 'x-ternal': true } })
  fastify.get('/', schemaExtension, () => {})

  fastify.ready(err => {
    t.error(err)
    const openapiObject = fastify.swagger()

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.ok(api['x-ternal'])
        t.same(api['x-ternal'], true)

        const definedPath = api.paths['/'].get
        t.ok(definedPath)
        t.same(definedPath['x-tension'], true)
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('parses form parameters when all api consumes application/x-www-form-urlencoded', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.register(fastifySwagger, openapiOption)
  fastify.get('/', schemaConsumes, () => {})

  fastify.ready(err => {
    t.error(err)
    const openapiObject = fastify.swagger()

    Swagger.validate(openapiObject)
      .then(function (api) {
        const definedPath = api.paths['/'].get
        t.ok(definedPath)
        t.same(definedPath.requestBody.content, {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              properties: {
                hello: {
                  description: 'hello',
                  type: 'string'
                }
              },
              required: ['hello']
            }
          }
        })
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - method', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.route({
    method: ['GET', 'POST'],
    url: '/',
    handler: function (request, reply) {
      reply.send({ hello: 'world' })
    }
  })

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('cookie, query, path description', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const schemaCookies = {
    schema: {
      cookies: {
        type: 'object',
        properties: {
          bar: { type: 'string', description: 'Bar' }
        }
      }
    }
  }
  const schemaQuerystring = {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hello: { type: 'string', description: 'Hello' }
        }
      }
    }
  }
  // test without description as other test case for params already have description
  const schemaParams = {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }

  fastify.get('/', schemaCookies, () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    Swagger.validate(openapiObject)
      .then(function (api) {
        const cookiesPath = api.paths['/'].get
        t.ok(cookiesPath)
        t.same(cookiesPath.parameters, [
          {
            required: false,
            in: 'cookie',
            name: 'bar',
            description: 'Bar',
            schema: {
              type: 'string'
            }
          }
        ])
        const querystringPath = api.paths['/example'].get
        t.ok(querystringPath)
        t.same(querystringPath.parameters, [
          {
            required: false,
            in: 'query',
            name: 'hello',
            description: 'Hello',
            schema: {
              type: 'string'
            }
          }
        ])
        const paramPath = api.paths['/parameters/{id}'].get
        t.ok(paramPath)
        t.same(paramPath.parameters, [
          {
            required: true,
            in: 'path',
            name: 'id',
            schema: {
              type: 'string'
            }
          }
        ])
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('cookie and query with serialization type', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const schemaCookies = {
    schema: {
      cookies: {
        type: 'object',
        properties: {
          bar: {
            type: 'object',
            'x-consume': 'application/json',
            required: ['foo'],
            properties: {
              foo: { type: 'string' },
              bar: { type: 'string' }
            }
          }
        }
      }
    }
  }
  const schemaQuerystring = {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hello: {
            type: 'object',
            'x-consume': 'application/json',
            required: ['bar'],
            properties: {
              bar: { type: 'string' },
              baz: { type: 'string' }
            }
          }
        }
      }
    }
  }

  fastify.get('/', schemaCookies, () => {})
  fastify.get('/example', schemaQuerystring, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const api = await Swagger.validate(openapiObject)

  const cookiesPath = api.paths['/'].get
  t.ok(cookiesPath)
  t.same(cookiesPath.parameters, [
    {
      required: false,
      in: 'cookie',
      name: 'bar',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['foo'],
            properties: {
              foo: { type: 'string' },
              bar: { type: 'string' }
            }
          }
        }
      }
    }
  ])

  const querystringPath = api.paths['/example'].get
  t.ok(querystringPath)
  t.same(querystringPath.parameters, [
    {
      required: false,
      in: 'query',
      name: 'hello',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['bar'],
            properties: {
              bar: { type: 'string' },
              baz: { type: 'string' }
            }
          }
        }
      }
    }
  ])
})

test('openapi should pass through operationId', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/hello', schemaOperationId, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('openapi should pass through Links', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/user/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'the user identifier, as userId'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              format: 'uuid'
            }
          }
        }
      }
    },
    links: {
      200: {
        address: {
          operationId: 'getUserAddress',
          parameters: {
            id: '$request.path.id'
          }
        }
      }
    }
  }, () => {})

  fastify.get('/user/:id/address', {
    schema: {
      operationId: 'getUserAddress',
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'the user identifier, as userId'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'string'
        }
      }
    }
  }, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
        t.same(api.paths['/user/{id}'].get.responses['200'].links, {
          address: {
            operationId: 'getUserAddress',
            parameters: {
              id: '$request.path.id'
            }
          }
        })
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('links without status code', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/user/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'the user identifier, as userId'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              format: 'uuid'
            }
          }
        }
      }
    },
    links: {
      201: {
        address: {
          operationId: 'getUserAddress',
          parameters: {
            id: '$request.path.id'
          }
        }
      }
    }
  }, () => {})

  fastify.get('/user/:id/address', {
    schema: {
      operationId: 'getUserAddress',
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'the user identifier, as userId'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'string'
        }
      }
    }
  }, () => {})

  fastify.ready(err => {
    t.error(err)
    t.throws(() => fastify.swagger(), new Error('missing status code 201 in route /user/:id'))
  })
})
