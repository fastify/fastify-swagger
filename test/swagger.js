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
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'tag' }
    ],
    externalDocs: {
      description: 'Find more info here',
      url: 'https://swagger.io'
    },
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    },
    security: [{
      apiKey: []
    }]
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

const opts4 = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {
          type: 'string',
          description: 'api token'
        }
      },
      required: ['authorization']
    }
  }
}

const opts5 = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        'x-api-token': {
          type: 'string',
          description: 'optional api token'
        },
        'x-api-version': {
          type: 'string',
          description: 'optional api version'
        }
      }
    },
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

const opts6 = {
  schema: {
    security: [
      {
        'apiKey': []
      }
    ]
  }
}

const opts7 = {
  schema: {
    consumes: ['application/x-www-form-urlencoded'],
    body: {
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

test('fastify.swagger should default swagger version', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger)

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.swagger, '2.0')
  })
})

test('fastify.swagger should default info properties', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger)

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.info.title, 'fastify-swagger')
    t.equal(swaggerObject.info.version, '1.0.0')
  })
})

test('fastify.swagger should return a valid swagger object', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})
  fastify.get('/headers', opts4, () => {})
  fastify.get('/headers/:id', opts5, () => {})
  fastify.get('/security', opts6, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.is(typeof swaggerObject, 'object')

    Swagger.validate(swaggerObject)
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
  fastify.get('/headers', opts4, () => {})
  fastify.get('/headers/:id', opts5, () => {})
  fastify.get('/security', opts6, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerYaml = fastify.swagger({ yaml: true })
    t.is(typeof swaggerYaml, 'string')

    try {
      yaml.safeLoad(swaggerYaml)
      t.pass('valid swagger yaml')
    } catch (err) {
      t.fail(err)
    }
  })
})

test('fastify.swagger basic properties', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
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
        }
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.info, swaggerInfo.swagger.info)
    t.equal(swaggerObject.host, swaggerInfo.swagger.host)
    t.equal(swaggerObject.schemes, swaggerInfo.swagger.schemes)
    t.ok(swaggerObject.paths)
    t.ok(swaggerObject.paths['/'])
  })
})

test('fastify.swagger definitions', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
    schema: {
      definitions: {
        'ExampleModel': {
          'type': 'object',
          'properties': {
            'id': {
              'type': 'integer',
              'description': 'Some id'
            },
            'name': {
              'type': 'string',
              'description': 'Name of smthng'
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
    t.equal(swaggerObject.definitions, swaggerInfo.swagger.definitions)
  })
})

test('fastify.swagger tags', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.tags, swaggerInfo.swagger.tags)
  })
})

test('fastify.swagger externalDocs', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.externalDocs, swaggerInfo.swagger.externalDocs)
  })
})

test('hide support', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
    schema: {
      hide: true,
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
    t.notOk(swaggerObject.paths['/'])
  })
})

test('deprecated route', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

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

test('route meta info', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
    schema: {
      operationId: 'doSomething',
      summary: 'Route summary',
      tags: ['tag'],
      description: 'Route description',
      produces: ['application/octet-stream'],
      consumes: ['application/x-www-form-urlencoded']
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
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('parses form parameters when all api consumes application/x-www-form-urlencoded', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.register(fastifySwagger, swaggerInfo)
  fastify.get('/', opts7, () => {})

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
          type: 'string'
        }])
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('required query params', t => {
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
  fastify.register(fastifySwagger, swaggerInfo)
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
  fastify.register(fastifySwagger, swaggerInfo)
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

test('basePath support', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    swagger: Object.assign({}, swaggerInfo.swagger, {
      basePath: '/prefix'
    })
  })

  fastify.get('/prefix/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths['/prefix/endpoint'])
    t.ok(swaggerObject.paths['/endpoint'])
  })
})

test('basePath support with prefix', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    prefix: '/prefix',
    swagger: Object.assign({}, swaggerInfo.swagger, {
      basePath: '/prefix'
    })
  })

  fastify.get('/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths['/prefix/endpoint'])
    t.ok(swaggerObject.paths['/endpoint'])
  })
})
