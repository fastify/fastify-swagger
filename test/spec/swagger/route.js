'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const yaml = require('yaml')
const fastifySwagger = require('../../../index')
const {
  swaggerOption,
  schemaBody,
  schemaConsumes,
  schemaExtension,
  schemaHeaders,
  schemaHeadersParams,
  schemaParams,
  schemaQuerystring,
  schemaSecurity
} = require('../../../examples/options')

test('swagger should return valid swagger object', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/headers', schemaHeaders, () => {})
  fastify.get('/headers/:id', schemaHeadersParams, () => {})
  fastify.get('/security', schemaSecurity, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(typeof swaggerObject, 'object')

  await Swagger.validate(swaggerObject)
  t.pass('valid swagger object')
})

test('swagger should return a valid swagger yaml', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, swaggerOption)

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

  await fastify.register(fastifySwagger, swaggerOption)

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

  const swaggerObject = fastify.swagger()

  await Swagger.validate(swaggerObject)
  t.pass('valid swagger object')
  t.ok(swaggerObject.paths['/'])
})

test('route options - meta', async (t) => {
  t.plan(8)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, swaggerOption)

  const opts = {
    schema: {
      operationId: 'doSomething',
      summary: 'Route summary',
      tags: ['tag'],
      description: 'Route description',
      produces: ['application/octet-stream'],
      consumes: ['application/x-www-form-urlencoded'],
      externalDocs: {
        description: 'Find more info here',
        url: 'https://swagger.io'
      }
    }
  }

  fastify.get('/', opts, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.equal(opts.schema.operationId, definedPath.operationId)
  t.equal(opts.schema.summary, definedPath.summary)
  t.same(opts.schema.tags, definedPath.tags)
  t.equal(opts.schema.description, definedPath.description)
  t.same(opts.schema.produces, definedPath.produces)
  t.same(opts.schema.consumes, definedPath.consumes)
  t.equal(opts.schema.externalDocs, definedPath.externalDocs)
})

test('route options - consumes', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, swaggerOption)
  fastify.post('/', schemaConsumes, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/'].post
  t.ok(definedPath)
  t.same(definedPath.parameters, [{
    in: 'formData',
    name: 'hello',
    description: 'hello',
    required: true,
    type: 'string'
  }])
})

test('route options - extension', async (t) => {
  t.plan(4)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { swagger: { 'x-ternal': true } })
  fastify.get('/', schemaExtension, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const api = await Swagger.validate(swaggerObject)
  t.ok(api['x-ternal'])
  t.same(api['x-ternal'], true)

  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.same(definedPath['x-tension'], true)
})

test('route options - querystring', async (t) => {
  t.plan(2)

  const opts = {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          world: { type: 'string', description: 'world description' }
        },
        required: ['hello']
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, swaggerOption)
  fastify.get('/', opts, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.same(definedPath.parameters, [
    {
      in: 'query',
      name: 'hello',
      type: 'string',
      required: true
    },
    {
      in: 'query',
      name: 'world',
      type: 'string',
      required: false,
      description: 'world description'
    }
  ])
})

test('swagger json output should not omit enum part in params config', async (t) => {
  t.plan(2)
  const opts = {
    schema: {
      params: {
        type: 'object',
        properties: {
          enumKey: { type: 'string', enum: ['enum1', 'enum2'] }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, swaggerOption)
  fastify.get('/test/:enumKey', opts, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/test/{enumKey}'].get
  t.ok(definedPath)
  t.same(definedPath.parameters, [{
    in: 'path',
    name: 'enumKey',
    type: 'string',
    enum: ['enum1', 'enum2'],
    required: true
  }])
})

test('custom verbs should not be interpreted as path params', async (t) => {
  t.plan(2)
  const opts = {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, swaggerOption)
  fastify.get('/resource/:id/sub-resource::watch', opts, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/resource/{id}/sub-resource:watch'].get
  t.ok(definedPath)
  t.same(definedPath.parameters, [{
    in: 'path',
    name: 'id',
    type: 'string',
    required: true
  }])
})

test('swagger json output should not omit consume in querystring schema', async (t) => {
  t.plan(1)
  const fastify = Fastify({
    ajv: {
      plugins: [
        function (ajv) {
          ajv.addKeyword({ keyword: 'x-consume' })
        }
      ]
    }
  })

  await fastify.register(fastifySwagger, swaggerOption)

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

  fastify.get('/', schemaQuerystring, () => {})

  await fastify.ready()

  try {
    fastify.swagger()
    t.fail('error was not thrown')
  } catch (err) {
    if (err.message.startsWith('Complex serialization is not supported by Swagger')) {
      t.pass('error was thrown')
    } else {
      t.error(err)
    }
  }
})

test('swagger should not support Links', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, swaggerOption)

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

  t.throws(() => fastify.swagger(), new Error('Swagger (Open API v2) does not support Links. Upgrade to OpenAPI v3 (see @fastify/swagger readme)'))
})

test('security headers ignored when declared in security and securityScheme', async (t) => {
  t.plan(6)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/address1/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      headers: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'api token'
          },
          somethingElse: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  fastify.get('/address2/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      headers: {
        type: 'object',
        properties: {
          authKey: {
            type: 'string',
            description: 'auth token'
          },
          somethingElse: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(typeof swaggerObject, 'object')

  const api = await Swagger.validate(swaggerObject)
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
    swagger: {
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'query'
        }
      },
      security: [{
        apiKey: []
      }]
    }
  })

  fastify.get('/address1/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'api token'
          },
          somethingElse: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  fastify.get('/address2/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          authKey: {
            type: 'string',
            description: 'auth token'
          },
          somethingElse: {
            type: 'string',
            description: 'common field'
          }
        }
      }
    }
  }, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(typeof swaggerObject, 'object')

  const api = await Swagger.validate(swaggerObject)
  t.pass('valid swagger object')
  t.ok(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'somethingElse')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'somethingElse')))
  t.notOk(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'apiKey')))
  t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'authKey')))
})
