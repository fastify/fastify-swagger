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
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
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
