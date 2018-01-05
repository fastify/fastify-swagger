'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
const fastifySwagger = require('../index')
const readFileSync = require('fs').readFileSync
const resolve = require('path').resolve

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
  },
  exposeRoute: true
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
    security: [
      {
        'apiKey': []
      }
    ]
  }
}

test('/documentation/json route', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})
  fastify.get('/example1', opts4, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/json'
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
  fastify.get('/example1', opts4, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/yaml'
  }, res => {
    t.is(typeof res.payload, 'string')
    t.is(res.headers['content-type'], 'application/x-yaml')
    try {
      yaml.safeLoad(res.payload)
      t.pass('valid swagger yaml')
    } catch (err) {
      t.fail(err)
    }
  })
})

test('/documenatation should send the swagger UI html', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})
  fastify.get('/example1', opts4, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation'
  }, res => {
    t.is(typeof res.payload, 'string')
    t.is(res.headers['content-type'], 'text/html')
    t.strictEqual(
      readFileSync(
        resolve(__dirname, '..', 'static', 'index.html'),
        'utf8'
      ),
      res.payload
    )
  })
})

test('/documenatation/:file should send back the correct file', t => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})
  fastify.get('/example1', opts4, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/'
  }, res => {
    t.is(typeof res.payload, 'string')
    t.is(res.headers['content-type'], 'text/html')
    t.strictEqual(
      readFileSync(
        resolve(__dirname, '..', 'static', 'index.html'),
        'utf8'
      ),
      res.payload
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/swagger-ui.css'
  }, res => {
    t.is(typeof res.payload, 'string')
    t.is(res.headers['content-type'], 'text/css')
    t.strictEqual(
      readFileSync(
        resolve(__dirname, '..', 'static', 'swagger-ui.css'),
        'utf8'
      ),
      res.payload
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/swagger-ui-bundle.js'
  }, res => {
    t.is(typeof res.payload, 'string')
    t.is(res.headers['content-type'], 'application/javascript')
    t.strictEqual(
      readFileSync(
        resolve(__dirname, '..', 'static', 'swagger-ui-bundle.js'),
        'utf8'
      ),
      res.payload
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/swagger-ui-standalone-preset.js'
  }, res => {
    t.is(typeof res.payload, 'string')
    t.is(res.headers['content-type'], 'application/javascript')
    t.strictEqual(
      readFileSync(
        resolve(__dirname, '..', 'static', 'swagger-ui-standalone-preset.js'),
        'utf8'
      ),
      res.payload
    )
  })
})

test('/documenatation/:file 404', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', opts1, () => {})
  fastify.post('/example', opts2, () => {})
  fastify.get('/parameters/:id', opts3, () => {})
  fastify.get('/example1', opts4, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/stuff.css'
  }, res => {
    const payload = JSON.parse(res.payload)
    t.strictEqual(res.statusCode, 404)
    t.deepEqual({
      message: 'Not found',
      error: 'Not Found',
      statusCode: 404
    }, payload)
  })
})
