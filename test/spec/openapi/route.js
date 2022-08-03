'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const yaml = require('yaml')
const fastifySwagger = require('../../../index')
const {
  openapiOption,
  openapiRelativeOptions,
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

test('openapi should return a valid swagger object', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/headers', schemaHeaders, () => {})
  fastify.get('/headers/:id', schemaHeadersParams, () => {})
  fastify.get('/security', schemaSecurity, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
})

test('openapi should return a valid swagger yaml', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/headers', schemaHeaders, () => {})
  fastify.get('/headers/:id', schemaHeadersParams, () => {})
  fastify.get('/security', schemaSecurity, () => {})

  await fastify.ready()

  const swaggerYaml = fastify.swagger({ yaml: true })
  t.equal(typeof swaggerYaml, 'string')
  yaml.parse(swaggerYaml)
  t.pass('valid swagger yaml')
})

test('route options - deprecated', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()

  await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
  t.ok(openapiObject.paths['/'])
})

test('route options - meta', async (t) => {
  t.plan(7)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  await fastify.ready()

  const openapiObject = fastify.swagger()

  const api = await Swagger.validate(openapiObject)
  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.equal(opts.schema.operationId, definedPath.operationId)
  t.equal(opts.schema.summary, definedPath.summary)
  t.same(opts.schema.tags, definedPath.tags)
  t.equal(opts.schema.description, definedPath.description)
  t.equal(opts.schema.servers, definedPath.servers)
  t.equal(opts.schema.externalDocs, definedPath.externalDocs)
})

test('route options - produces', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', schemaProduces, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()

  const api = await Swagger.validate(openapiObject)
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

test('route options - cookies', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', schemaCookies, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const api = await Swagger.validate(openapiObject)
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

test('route options - extension', async (t) => {
  t.plan(4)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: { 'x-ternal': true } })
  fastify.get('/', schemaExtension, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()

  const api = await Swagger.validate(openapiObject)
  t.ok(api['x-ternal'])
  t.same(api['x-ternal'], true)

  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.same(definedPath['x-tension'], true)
})

test('parses form parameters when all api consumes application/x-www-form-urlencoded', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, openapiOption)
  fastify.post('/', schemaConsumes, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()

  const api = await Swagger.validate(openapiObject)
  const definedPath = api.paths['/'].post
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

test('route options - method', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.route({
    method: ['GET', 'POST'],
    url: '/',
    handler: function (request, reply) {
      reply.send({ hello: 'world' })
    }
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
})

test('cookie, query, path description', async (t) => {
  t.plan(6)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

test('cookie and query with serialization type', async (t) => {
  t.plan(4)
  const fastify = Fastify({
    ajv: {
      plugins: [
        function (ajv) {
          ajv.addKeyword({
            keyword: 'x-consume'
          })
        }
      ]
    }
  })

  await fastify.register(fastifySwagger, openapiOption)

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

test('openapi should pass through operationId', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/hello', schemaOperationId, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
})

test('openapi should pass through Links', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  const api = await Swagger.validate(openapiObject)
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

test('links without status code', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  await fastify.ready()

  t.throws(() => fastify.swagger(), new Error('missing status code 201 in route /user/:id'))
})

test('security headers ignored when declared in security and securityScheme', async (t) => {
  t.plan(6)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/address1/:id', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'api token'
          },
          id: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  fastify.get('/address2/:id', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          authKey: {
            type: 'string',
            description: 'auth token'
          },
          id: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  const api = await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
  t.ok(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'id')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'id')))
  t.notOk(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'apiKey')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'authKey')))
})

test('security querystrings ignored when declared in security and securityScheme', async (t) => {
  t.plan(6)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    openapi: {
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'apiKey',
            in: 'query'
          }
        }
      },
      security: [{
        apiKey: []
      }]
    }
  })

  fastify.get('/address1/:id', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'api token'
          },
          id: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  fastify.get('/address2/:id', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          authKey: {
            type: 'string',
            description: 'auth token'
          },
          id: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  const api = await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
  t.ok(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'id')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'id')))
  t.notOk(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'apiKey')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'authKey')))
})

test('security cookies ignored when declared in security and securityScheme', async (t) => {
  t.plan(6)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    openapi: {
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'apiKey',
            in: 'cookie'
          }
        }
      },
      security: [{
        apiKey: []
      }]
    }
  })

  fastify.get('/address1/:id', {
    schema: {
      cookies: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'api token'
          },
          id: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  fastify.get('/address2/:id', {
    schema: {
      cookies: {
        type: 'object',
        properties: {
          authKey: {
            type: 'string',
            description: 'auth token'
          },
          id: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  const api = await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
  t.ok(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'id')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'id')))
  t.notOk(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'apiKey')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'authKey')))
})

test('path params on relative url', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiRelativeOptions)

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
  fastify.get('/parameters/:id', schemaParams, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const api = await Swagger.validate(openapiObject)
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
