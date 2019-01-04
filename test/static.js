'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifySwagger = require('../index')
const yaml = require('js-yaml')

const resolve = require('path').resolve
const readFileSync = require('fs').readFileSync

test('specification validation check works', t => {
  const specifications = [
    '',
    '123',
    {},
    {
      path: 123
    },
    {
      path: '/hello/lionel.richie'
    },
    {
      path: './examples/example-static-specification.yaml',
      postProcessor: 'hello'
    }
  ]

  t.plan(specifications.length * 2)

  specifications.forEach(specification => {
    const fastify = Fastify()
    fastify.register(fastifySwagger, {
      mode: 'static',
      specification,
      exposeRoute: true
    })

    fastify.ready(err => {
      t.notEqual(err, undefined)
      t.matchSnapshot(err.toString())
    })
  })
})

test('swagger route returns yaml', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  })

  // check that yaml is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/yaml'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/x-yaml')
      try {
        yaml.safeLoad(res.payload)
        t.pass('valid swagger yaml')
      } catch (err) {
        t.fail(err)
      }
    }
  )
})
test('swagger route returns json', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      type: 'file',
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  })

  // check that json is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)

      try {
        var payload = JSON.parse(res.payload)
        t.matchSnapshot(JSON.stringify(payload, null, 2))
      } catch (error) {
        t.fail(error)
      }
    }
  )
})

test('postProcessor works, swagger route returns updated yaml', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      postProcessor: function (swaggerObject) {
        swaggerObject.servers[0].url = 'http://localhost:4000/'
        return swaggerObject
      }
    },
    exposeRoute: true
  })

  // check that yaml is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/yaml'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/x-yaml')
      try {
        yaml.safeLoad(res.payload)
        t.matchSnapshot(res.payload)
        t.pass('valid swagger yaml')
      } catch (err) {
        t.fail(err)
      }
    }
  )
})
test('swagger route returns explicitly passed doc', t => {
  t.plan(3)
  const fastify = Fastify()

  const document = {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    }
  }
  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      document
    },
    exposeRoute: true
  })

  // check that json is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)

      try {
        var payload = JSON.parse(res.payload)
        t.matchSnapshot(JSON.stringify(payload, null, 2))
        t.pass('valid explicitly passed spec document')
      } catch (error) {
        t.fail(error)
      }
    }
  )
})

test('/documentation/:file should serve static file from the location of main specification file', t => {
  t.plan(7)

  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    }
  }
  const fastify = new Fastify()
  fastify.register(fastifySwagger, config)

  fastify.inject({
    method: 'GET',
    url: '/documentation/non-existing-file'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/example-static-specification.yaml'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(
      readFileSync(
        resolve(__dirname, '..', 'examples', 'example-static-specification.yaml'),
        'utf8'
      ),
      res.payload
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/dynamic.js'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
  })
})

test('/documentation/non-existing-file calls custom NotFoundHandler', t => {
  t.plan(2)

  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    }
  }
  const fastify = new Fastify()
  fastify.register(fastifySwagger, config)
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(410).send()
  })

  fastify.inject({
    method: 'GET',
    url: '/documentation/some-file-that-does-not-exist.js'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 410)
  })
})

test('/documentation/:file should be served from custom location', t => {
  t.plan(3)

  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', 'static')
    }
  }
  const fastify = new Fastify()
  fastify.register(fastifySwagger, config)

  fastify.inject({
    method: 'GET',
    url: '/documentation/oauth2-redirect.html'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(
      readFileSync(resolve(__dirname, '..', 'static', 'oauth2-redirect.html'), 'utf8'),
      res.payload
    )
  })
})

test('/documentation/:file should be served from custom location with trailing slash(es)', t => {
  t.plan(3)

  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', 'static') + '/'
    }
  }
  const fastify = new Fastify()
  fastify.register(fastifySwagger, config)

  fastify.inject({
    method: 'GET',
    url: '/documentation/oauth2-redirect.html'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(
      readFileSync(resolve(__dirname, '..', 'static', 'oauth2-redirect.html'), 'utf8'),
      res.payload
    )
  })
})
