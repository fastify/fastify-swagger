'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
const fastifySwagger = require('../index')

const swaggerInfo = {
  openapi: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    servers: [
      {
        url: 'http://localhost'
      }
    ],
    tags: [
      { name: 'tag' }
    ],
    externalDocs: {
      description: 'Find more info here',
      url: 'https://swagger.io'
    }
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
      world: { type: 'string' },
      foo: { type: 'array', items: { type: 'string' } },
      bar: { type: 'object', properties: { baz: { type: 'string' } } }
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
        apiKey: []
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

const opts8 = {
  schema: {
    'x-tension': true
  }
}

const opts9 = {
  schema: {
    produces: ['*/*'],
    response: {
      200: {
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
}

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

test('hide support when property set in transform() - property', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    ...swaggerInfo,
    transform: schema => {
      return { ...schema, hide: true }
    }
  })

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
    t.notOk(swaggerObject.paths['/'])
  })
})

test('fastify.swagger components', t => {
  t.plan(2)
  const fastify = Fastify()

  swaggerInfo.openapi.components = {
    schemas: {
      ExampleModel: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Some id'
          },
          name: {
            type: 'string',
            description: 'Name of smthng'
          }
        }
      }
    }
  }

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.deepEquals(swaggerObject.components, swaggerInfo.openapi.components)
    delete swaggerInfo.openapi.components // remove what we just added
  })
})

test('hide support - tags Default', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
    schema: {
      tags: ['X-HIDDEN'],
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

test('hide support - tags Custom', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, { ...swaggerInfo, hiddenTag: 'NOP' })

  const opts = {
    schema: {
      tags: ['NOP'],
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
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
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

test('route with produces', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', opts9, () => {})

  fastify.ready(err => {
    t.error(err)
    const swaggerObject = fastify.swagger()

    Swagger.validate(swaggerObject)
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

test('includes swagger extensions', t => {
  t.plan(5)
  const fastify = Fastify()
  fastify.register(fastifySwagger, { openapi: { 'x-ternal': true } })
  fastify.get('/', opts8, () => {})

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

test('basePath support', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    openapi: Object.assign({}, swaggerInfo.openapi, {
      servers: [
        {
          url: 'http://localhost/prefix'
        }
      ]
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

test('basePath maintained when stripBasePath is set to false', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    stripBasePath: false,
    openapi: Object.assign({}, swaggerInfo.openapi, {
      servers: [
        {
          url: 'http://localhost/foo'
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths.endpoint)
    t.notOk(swaggerObject.paths['/endpoint'])
    t.ok(swaggerObject.paths['/foo/endpoint'])
  })
})

test('cache - json', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.ready(err => {
    t.error(err)

    fastify.swagger()
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

test('cache - yaml', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.ready(err => {
    t.error(err)

    fastify.swagger({ yaml: true })
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

test('route with multiple method', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.route({
    method: ['GET', 'POST'],
    url: '/',
    handler: function (request, reply) {
      reply.send({ hello: 'world' })
    }
  })

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
