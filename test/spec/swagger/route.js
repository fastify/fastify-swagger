'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
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

test('swagger should return valid swagger object', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

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

    const swaggerObject = fastify.swagger()
    t.equal(typeof swaggerObject, 'object')

    Swagger.validate(swaggerObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('swagger should return a valid swagger yaml', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

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

  fastify.register(fastifySwagger, swaggerOption)

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
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
      .then(function (api) {
        t.pass('valid swagger object')
        t.ok(swaggerObject.paths['/'])
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - meta', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

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

  fastify.ready(err => {
    t.error(err)
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
      .then(function (api) {
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
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - consumes', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.register(fastifySwagger, swaggerOption)
  fastify.get('/', schemaConsumes, () => {})

  fastify.ready(err => {
    t.error(err)
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
      .then(function (api) {
        const definedPath = api.paths['/'].get
        t.ok(definedPath)
        t.same(definedPath.parameters, [{
          in: 'formData',
          name: 'hello',
          description: 'hello',
          required: true,
          type: 'string'
        }])
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('route options - extension', t => {
  t.plan(5)
  const fastify = Fastify()
  fastify.register(fastifySwagger, { swagger: { 'x-ternal': true } })
  fastify.get('/', schemaExtension, () => {})

  fastify.ready(err => {
    t.error(err)
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
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

test('route options - querystring', t => {
  t.plan(3)

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
  fastify.register(fastifySwagger, swaggerOption)
  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
      .then(function (api) {
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
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('swagger json output should not omit enum part in params config', t => {
  t.plan(3)
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
  fastify.register(fastifySwagger, swaggerOption)
  fastify.get('/test/:enumKey', opts, () => {})

  fastify.ready(err => {
    t.error(err)
    const swaggerObject = fastify.swagger()
    Swagger.validate(swaggerObject)
      .then((api) => {
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
      .catch(err => {
        t.error(err)
      })
  })
})

test('custom verbs should not be interpreted as path params', t => {
  t.plan(3)
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
  fastify.register(fastifySwagger, swaggerOption)
  fastify.get('/resource/:id/sub-resource::watch', opts, () => {})

  fastify.ready(err => {
    t.error(err)
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
      .then((api) => {
        const definedPath = api.paths['/resource/{id}/sub-resource:watch'].get
        t.ok(definedPath)
        t.same(definedPath.parameters, [{
          in: 'path',
          name: 'id',
          type: 'string',
          required: true
        }])
      })
      .catch(err => {
        console.log(err)
        t.error(err)
      })
  })
})

test('swagger json output should not omit consume in querystring schema', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

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

test('swagger should not support Links', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

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

    t.throws(() => fastify.swagger(), new Error('Swagger (Open API v2) does not support Links. Upgrade to OpenAPI v3 (see fastify-swagger readme)'))
  })
})

test('security headers ignored when declared in security and securityScheme', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

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

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(typeof swaggerObject, 'object')

    Swagger.validate(swaggerObject)
      .then(function (api) {
        t.pass('valid swagger object')
        t.ok(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'id')))
        t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'id')))
        t.notOk(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'apiKey')))
        t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'authKey')))
      })
      .catch(function (err) {
        t.error(err)
      })
  })
})

test('security querystrings ignored when declared in security and securityScheme', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
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

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(typeof swaggerObject, 'object')

    Swagger.validate(swaggerObject)
      .then(function (api) {
        t.pass('valid swagger object')
        t.ok(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'somethingElse')))
        t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'somethingElse')))
        t.notOk(api.paths['/address1/{id}'].get.parameters.find(({ name }) => (name === 'apiKey')))
        t.ok(api.paths['/address2/{id}'].get.parameters.find(({ name }) => (name === 'authKey')))
      })
      .catch(function (err) {
        t.error(err)
      })
  })
})
