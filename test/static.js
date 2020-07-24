'use strict'

const path = require('path')
const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifySwagger = require('../index')
const fastifySwaggerDynamic = require('../dynamic')
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

test('registering plugin with invalid mode throws an error', t => {
  const config = {
    mode: 'error'
  }

  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifySwagger, config)

  fastify.ready(err => {
    t.equal(err.message, 'unsupported mode, should be one of [\'static\', \'dynamic\']')
  })
})

test('unsupported file extension in specification.path throws an error', t => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.js'
    },
    exposeRoute: true
  }

  t.plan(1)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  fastify.ready(err => {
    t.equal(err.message, 'specification.path extension name is not supported, should be one from [\'.yaml\', \'.json\']')
  })
})

test('non-string specification.baseDir throws an error ', t => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: 1
    }
  }

  t.plan(1)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  fastify.ready(err => {
    t.equal(err.message, 'specification.baseDir should be string')
  })
})

test('non-object specification.document throws an error', t => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      document: 'doc'
    }
  }

  t.plan(1)
  const fastify = new Fastify()
  fastify.register(fastifySwagger, config)

  fastify.ready(err => {
    t.equal(err.message, 'specification.document is not an object')
  })
})

test('swagger route returns yaml', t => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  }

  t.plan(4)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

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
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(4)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  // check that json is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/json; charset=utf-8')
      try {
        yaml.safeLoad(res.payload)
        t.pass('valid swagger json')
      } catch (err) {
        t.fail(err)
      }
    }
  )
})

test('postProcessor works, swagger route returns updated yaml', t => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      postProcessor: function (swaggerObject) {
        swaggerObject.servers[0].url = 'http://localhost:4000/'
        return swaggerObject
      }
    },
    exposeRoute: true
  }

  t.plan(5)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

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
  const document = {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    }
  }

  const config = {
    mode: 'static',
    specification: {
      document
    },
    exposeRoute: true
  }

  t.plan(3)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

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
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    }
  }

  t.plan(7)
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
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    }
  }

  t.plan(2)
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
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', 'static')
    }
  }

  t.plan(3)
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
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', 'static') + '/'
    }
  }

  t.plan(3)
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

test('/documentation/yaml returns cache.swaggerString on second request in static mode', t => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  }

  t.plan(8)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

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

  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/yaml'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/x-yaml')
      yaml.safeLoad(res.payload)
      t.pass('valid swagger yaml')
    }
  )
})

test('/documentation/json returns cache.swaggerObject on second request in static mode', t => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(8)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/json; charset=utf-8')
      t.pass('valid swagger json')
    }
  )

  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/json; charset=utf-8')
      t.pass('valid swagger json')
    }
  )
})

test('/documentation/yaml returns cache.swaggerString on second request in dynamic mode', t => {
  const config = {
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  }

  t.plan(8)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

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

test('/documentation/json returns cache.swaggerObject on second request in dynamic mode', t => {
  const config = {
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(8)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/json; charset=utf-8')
      t.pass('valid swagger json')
    }
  )

  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/json; charset=utf-8')
      t.pass('valid swagger json')
    }
  )
})

test('swagger routes are not exposed', t => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: false
  }

  t.plan(4)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  // check that yaml is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/json; charset=utf-8')
      t.pass('routes are not exposed')
    }
  )
})

test('inserts default opts in fastifySwagger', t => {
  t.plan(1)
  const fastify = Fastify()
  const next = () => {}

  fastify.register(() => (fastifySwagger(fastify, null, next)))

  fastify.ready(() => {
    t.pass('Inserted default option for fastifySwagger.')
  })
})

test('inserts default package name', t => {
  const config = {
    mode: 'dynamic',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(2)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  const originalPathJoin = path.join
  const testPackageJSON = path.join(__dirname, '../examples/test-package.json')

  path.join = (...args) => {
    if (args[1] === 'package.json') {
      return testPackageJSON
    }
    return originalPathJoin(...args)
  }

  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.pass('Inserted default package name.')
    }
  )
})

test('throws an error if cannot parse package\'s JSON', t => {
  const config = {
    mode: 'dynamic',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(2)
  const fastify = Fastify()
  fastify.register(fastifySwagger, config)

  const originalPathJoin = path.join
  const testPackageJSON = path.join(__dirname, '')

  path.join = (...args) => {
    if (args[1] === 'package.json') {
      return testPackageJSON
    }
    return originalPathJoin(...args)
  }

  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)
      t.equal(err, null)
    }
  )
})

test('inserts default opts in fastifySwaggerDynamic (dynamic.js)', t => {
  t.plan(1)
  const fastify = Fastify()
  const next = () => {}

  fastify.register(() => (fastifySwaggerDynamic(fastify, null, next)))

  fastify.ready(() => {
    t.pass('Inserted default option for fastifySwagger.')
  })
})
