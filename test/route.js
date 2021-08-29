'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
const fastifySwagger = require('../index')
const {
  schemaQuerystring,
  schemaBody,
  schemaParams,
  schemaSecurity
} = require('../examples/options')
let {
  swaggerOption
} = require('../examples/options')

const resolve = require('path').resolve
const readFileSync = require('fs').readFileSync

swaggerOption = {
  ...swaggerOption,
  exposeRoute: true
}

const schemaParamsWithoutDesc = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string'
        }
      }
    }
  }
}

const schemaParamsWithKey = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'user id'
        },
        key: {
          type: 'string',
          description: 'just some random key'
        }
      }
    }
  }
}

test('/documentation/json route', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  }, (err, res) => {
    t.error(err)

    const payload = JSON.parse(res.payload)

    Swagger.validate(payload)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('/documentation/uiConfig route', t => {
  t.plan(2)
  const fastify = Fastify()

  const uiConfig = {
    docExpansion: 'full'
  }

  const opts = {
    ...swaggerOption,
    uiConfig
  }

  fastify.register(fastifySwagger, opts)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/uiConfig'
  }, (err, res) => {
    t.error(err)

    const payload = JSON.parse(res.payload)

    t.match(payload, uiConfig, 'uiConfig should be valid')
  })
})

test('/documentation/initOAuth route', t => {
  t.plan(2)
  const fastify = Fastify()

  const initOAuth = {
    scopes: ['openid', 'profile', 'email', 'offline_access']
  }

  const opts = {
    ...swaggerOption,
    initOAuth
  }

  fastify.register(fastifySwagger, opts)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/initOAuth'
  }, (err, res) => {
    t.error(err)

    const payload = JSON.parse(res.payload)

    t.match(payload, initOAuth, 'initOAuth should be valid')
  })
})

test('fastify.swagger should return a valid swagger yaml', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})
  fastify.all('/parametersWithoutDesc/:id', schemaParamsWithoutDesc, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/yaml'
  }, (err, res) => {
    t.error(err)
    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/x-yaml')
    try {
      yaml.load(res.payload)
      t.pass('valid swagger yaml')
    } catch (err) {
      t.fail(err)
    }
  })
})

test('/documentation should redirect to ./documentation/static/index.html', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './documentation/static/index.html')
    t.equal(typeof res.payload, 'string')
  })
})

test('/documentation/ should redirect to ./static/index.html', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './static/index.html')
    t.equal(typeof res.payload, 'string')
  })
})

test('/v1/documentation should redirect to ./documentation/static/index.html', t => {
  t.plan(4)
  const fastify = Fastify()
  const opts = JSON.parse(JSON.stringify(swaggerOption))
  opts.routePrefix = '/v1/documentation'
  fastify.register(fastifySwagger, opts)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/v1/documentation'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './documentation/static/index.html')
    t.equal(typeof res.payload, 'string')
  })
})

test('/v1/documentation/ should redirect to ./static/index.html', t => {
  t.plan(4)
  const fastify = Fastify()
  const opts = JSON.parse(JSON.stringify(swaggerOption))
  opts.routePrefix = '/v1/documentation'
  fastify.register(fastifySwagger, opts)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/v1/documentation/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './static/index.html')
    t.equal(typeof res.payload, 'string')
  })
})

test('/v1/foobar should redirect to ./foobar/static/index.html - in plugin', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, options, next) {
    const opts = JSON.parse(JSON.stringify(swaggerOption))
    opts.routePrefix = '/foobar'
    fastify.register(fastifySwagger, opts)

    fastify.get('/', () => {})
    fastify.post('/', () => {})
    fastify.get('/example', schemaQuerystring, () => {})
    fastify.post('/example', schemaBody, () => {})
    fastify.get('/parameters/:id', schemaParams, () => {})
    fastify.get('/example1', schemaSecurity, () => {})

    next()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/foobar'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './foobar/static/index.html')
    t.equal(typeof res.payload, 'string')
  })
})

test('/v1/foobar/ should redirect to ./static/index.html - in plugin', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, options, next) {
    const opts = JSON.parse(JSON.stringify(swaggerOption))
    opts.routePrefix = '/foobar'
    fastify.register(fastifySwagger, opts)

    fastify.get('/', () => {})
    fastify.post('/', () => {})
    fastify.get('/example', schemaQuerystring, () => {})
    fastify.post('/example', schemaBody, () => {})
    fastify.get('/parameters/:id', schemaParams, () => {})
    fastify.get('/example1', schemaSecurity, () => {})

    next()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/foobar/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './static/index.html')
    t.equal(typeof res.payload, 'string')
  })
})

test('with routePrefix: \'/\' should redirect to ./static/index.html', t => {
  t.plan(4)
  const fastify = Fastify()

  const opts = JSON.parse(JSON.stringify(swaggerOption))
  opts.routePrefix = '/'
  fastify.register(fastifySwagger, opts)

  fastify.get('/foo', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './static/index.html')
    t.equal(typeof res.payload, 'string')
  })
})

test('/documentation/static/:file should send back the correct file', t => {
  t.plan(24)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './static/index.html')
  })

  fastify.ready(() => {
    fastify.inject({
      method: 'GET',
      url: '/documentation/static/'
    }, (err, res) => {
      t.error(err)
      t.equal(typeof res.payload, 'string')
      t.equal(res.headers['content-type'], 'text/html; charset=UTF-8')
      t.equal(
        readFileSync(
          resolve(__dirname, '..', 'static', 'index.html'),
          'utf8'
        ),
        res.payload
      )
      t.ok(res.payload.indexOf('resolveUrl') !== -1)
    })
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/static/oauth2-redirect.html'
  }, (err, res) => {
    t.error(err)
    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'text/html; charset=UTF-8')
    t.equal(
      readFileSync(
        resolve(__dirname, '..', 'static', 'oauth2-redirect.html'),
        'utf8'
      ),
      res.payload
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/static/swagger-ui.css'
  }, (err, res) => {
    t.error(err)
    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'text/css; charset=UTF-8')
    t.equal(
      readFileSync(
        resolve(__dirname, '..', 'static', 'swagger-ui.css'),
        'utf8'
      ),
      res.payload
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/static/swagger-ui-bundle.js'
  }, (err, res) => {
    t.error(err)
    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/javascript; charset=UTF-8')
    t.equal(
      readFileSync(
        resolve(__dirname, '..', 'static', 'swagger-ui-bundle.js'),
        'utf8'
      ),
      res.payload
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/static/swagger-ui-standalone-preset.js'
  }, (err, res) => {
    t.error(err)
    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/javascript; charset=UTF-8')
    t.equal(
      readFileSync(
        resolve(__dirname, '..', 'static', 'swagger-ui-standalone-preset.js'),
        'utf8'
      ),
      res.payload
    )
  })
})

test('/documentation/static/:file 404', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation/static/stuff.css'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 404)
    t.match(payload, {
      error: 'Not Found',
      statusCode: 404
    })
  })
})

test('/documentation2/json route (overwrite)', t => {
  t.plan(2)
  const fastify = Fastify()
  const swaggerOptionWithRouteOverwrite = JSON.parse(JSON.stringify(swaggerOption))
  swaggerOptionWithRouteOverwrite.routePrefix = '/documentation2'
  fastify.register(fastifySwagger, swaggerOptionWithRouteOverwrite)

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/example', schemaQuerystring, () => {})
  fastify.post('/example', schemaBody, () => {})
  fastify.get('/parameters/:id', schemaParams, () => {})
  fastify.get('/example1', schemaSecurity, () => {})
  fastify.get('/parameters/:id/:key', schemaParamsWithKey, () => {})

  fastify.inject({
    method: 'GET',
    url: '/documentation2/json'
  }, (err, res) => {
    t.error(err)

    const payload = JSON.parse(res.payload)

    Swagger.validate(payload)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('/documentation/:myfile should return 404 in dynamic mode', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(fastifySwagger, swaggerOption)

  fastify.inject({
    method: 'GET',
    url: '/documentation/swagger-ui.js'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('/documentation/:myfile should run custom NotFoundHandler in dynamic mode', t => {
  t.plan(2)
  const fastify = Fastify()
  const notFoundHandler = function (req, reply) {
    reply.code(410).send()
  }
  fastify.setNotFoundHandler(notFoundHandler)
  fastify.register(fastifySwagger, swaggerOption)

  fastify.inject({
    method: 'GET',
    url: '/documentation/swagger-ui.js'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 410)
  })
})

test('/documentation/ should redirect to ./static/index.html', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.register(fastifySwagger, swaggerOption)

  fastify.inject({
    method: 'GET',
    url: '/documentation/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 302)
    t.equal(res.headers.location, './static/index.html')
  })
})
