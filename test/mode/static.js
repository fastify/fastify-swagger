'use strict'

const path = require('path')
const { test } = require('tap')
const Fastify = require('fastify')
const fastifySwagger = require('../../index')
const fastifySwaggerDynamic = require('../../lib/mode/dynamic')
const yaml = require('js-yaml')
const Swagger = require('@apidevtools/swagger-parser')

const resolve = require('path').resolve
const readFileSync = require('fs').readFileSync

test('specification validation check works', async (t) => {
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

  for (const specification of specifications) {
    try {
      const fastify = Fastify()
      await fastify.register(fastifySwagger, {
        mode: 'static',
        specification,
        exposeRoute: true
      })
    } catch (err) {
      t.not(err, undefined)
      t.matchSnapshot(err.toString())
    }
  }
})

test('registering plugin with invalid mode throws an error', async (t) => {
  const config = {
    mode: 'error'
  }

  t.plan(1)
  const fastify = Fastify()

  try {
    await fastify.register(fastifySwagger, config)
  } catch (err) {
    t.equal(err.message, 'unsupported mode, should be one of [\'static\', \'dynamic\']')
  }
})

test('unsupported file extension in specification.path throws an error', async (t) => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.js'
    },
    exposeRoute: true
  }

  t.plan(1)
  const fastify = Fastify()

  try {
    await fastify.register(fastifySwagger, config)
  } catch (err) {
    t.equal(err.message, 'specification.path extension name is not supported, should be one from [\'.yaml\', \'.json\']')
  }
})

test('non-string specification.baseDir throws an error ', async (t) => {
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

  try {
    await fastify.register(fastifySwagger, config)
  } catch (err) {
    t.equal(err.message, 'specification.baseDir should be string')
  }
})

test('non-object specification.document throws an error', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      document: 'doc'
    }
  }

  t.plan(1)
  const fastify = new Fastify()

  try {
    await fastify.register(fastifySwagger, config)
  } catch (err) {
    t.equal(err.message, 'specification.document is not an object')
  }
})

test('swagger route returns yaml', async (t) => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  }

  t.plan(3)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  // check that yaml is there
  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/yaml'
  })

  t.equal(typeof res.payload, 'string')
  t.equal(res.headers['content-type'], 'application/x-yaml')
  yaml.load(res.payload)
  t.pass('valid swagger yaml')
})

test('swagger route returns json', async (t) => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(3)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  // check that json is there
  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  })

  t.equal(typeof res.payload, 'string')
  t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  yaml.load(res.payload)
  t.pass('valid swagger json')
})

test('postProcessor works, swagger route returns updated yaml', async (t) => {
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

  t.plan(4)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  // check that yaml is there
  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/yaml'
  })

  t.equal(typeof res.payload, 'string')
  t.equal(res.headers['content-type'], 'application/x-yaml')
  yaml.load(res.payload)
  t.matchSnapshot(res.payload)
  t.pass('valid swagger yaml')
})

test('swagger route returns explicitly passed doc', async (t) => {
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

  t.plan(2)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  // check that json is there
  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  })

  const payload = JSON.parse(res.payload)
  t.matchSnapshot(JSON.stringify(payload, null, 2))
  t.pass('valid explicitly passed spec document')
})

test('/documentation/:file should serve static file from the location of main specification file', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    }
  }

  t.plan(4)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/non-existing-file'
    })

    t.equal(res.statusCode, 404)
  }

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/example-static-specification.yaml'
    })

    t.equal(res.statusCode, 200)
    t.equal(
      readFileSync(
        resolve(__dirname, '..', '..', 'examples', 'example-static-specification.yaml'),
        'utf8'
      ),
      res.payload
    )
  }

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/dynamic-swagger.js'
    })

    t.equal(res.statusCode, 200)
  }
})

test('/documentation/non-existing-file calls custom NotFoundHandler', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    }
  }

  t.plan(1)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(410).send()
  })

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/some-file-that-does-not-exist.js'
  })

  t.equal(res.statusCode, 410)
})

test('/documentation/:file should be served from custom location', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', '..', 'static')
    }
  }

  t.plan(2)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/oauth2-redirect.html'
  })

  t.equal(res.statusCode, 200)
  t.equal(
    readFileSync(resolve(__dirname, '..', '..', 'static', 'oauth2-redirect.html'), 'utf8'),
    res.payload
  )
})

test('/documentation/:file should be served from custom location with trailing slash(es)', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', '..', 'static') + '/'
    }
  }

  t.plan(2)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/oauth2-redirect.html'
  })

  t.equal(res.statusCode, 200)
  t.equal(
    readFileSync(resolve(__dirname, '..', '..', 'static', 'oauth2-redirect.html'), 'utf8'),
    res.payload
  )
})

test('/documentation/yaml returns cache.swaggerString on second request in static mode', async (t) => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  }

  t.plan(6)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/yaml'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/x-yaml')
    yaml.load(res.payload)
    t.pass('valid swagger yaml')
  }

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/yaml'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/x-yaml')
    yaml.load(res.payload)
    t.pass('valid swagger yaml')
  }
})

test('/documentation/json returns cache.swaggerObject on second request in static mode', async (t) => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(6)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/json'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.pass('valid swagger json')
  }

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/json'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.pass('valid swagger json')
  }
})

test('/documentation/yaml returns cache.swaggerString on second request in dynamic mode', async (t) => {
  const config = {
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  }

  t.plan(6)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/yaml'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/x-yaml')
    yaml.load(res.payload)
    t.pass('valid swagger yaml')
  }

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/yaml'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/x-yaml')
    yaml.load(res.payload)
    t.pass('valid swagger yaml')
  }
})

test('/documentation/json returns cache.swaggerObject on second request in dynamic mode', async (t) => {
  const config = {
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(6)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/json'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.pass('valid swagger json')
  }

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/documentation/json'
    })

    t.equal(typeof res.payload, 'string')
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.pass('valid swagger json')
  }
})

test('swagger routes are not exposed', async (t) => {
  const config = {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: false
  }

  t.plan(3)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  // check that yaml is there
  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  })

  t.equal(typeof res.payload, 'string')
  t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  t.pass('routes are not exposed')
})

test('inserts default opts in fastifySwagger', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger)

  t.pass('Inserted default option for fastifySwagger.')
})

test('inserts default package name', async (t) => {
  const config = {
    mode: 'dynamic',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(1)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  const originalPathJoin = path.join
  const testPackageJSON = path.join(__dirname, '../../examples/test-package.json')

  path.join = (...args) => {
    if (args[3] === 'package.json') {
      return testPackageJSON
    }
    return originalPathJoin(...args)
  }

  await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  })

  t.pass('Inserted default package name.')
})

test('inserts default package name - openapi', async (t) => {
  const config = {
    mode: 'dynamic',
    openapi: {
      servers: []
    },
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(1)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  const originalPathJoin = path.join
  const testPackageJSON = path.join(__dirname, '../../examples/test-package.json')

  path.join = (...args) => {
    if (args[3] === 'package.json') {
      return testPackageJSON
    }
    return originalPathJoin(...args)
  }

  await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  })

  t.pass('Inserted default package name.')
})

test('throws an error if cannot parse package\'s JSON', async (t) => {
  const config = {
    mode: 'dynamic',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(1)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  const originalPathJoin = path.join
  const testPackageJSON = path.join(__dirname, '')

  path.join = (...args) => {
    if (args[3] === 'package.json') {
      return testPackageJSON
    }
    return originalPathJoin(...args)
  }

  await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  })

  t.pass('no error should throw')
})

test('throws an error if cannot parse package\'s JSON - openapi', async (t) => {
  const config = {
    mode: 'dynamic',
    openapi: {
      servers: []
    },
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(1)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  const originalPathJoin = path.join
  const testPackageJSON = path.join(__dirname, '')

  path.join = (...args) => {
    if (args[3] === 'package.json') {
      return testPackageJSON
    }
    return originalPathJoin(...args)
  }

  await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  })

  t.pass('no error should throw')
})

test('inserts default opts in fastifySwaggerDynamic (dynamic.js)', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwaggerDynamic)

  t.pass('Inserted default option for fastifySwagger.')
})

test('/documentation/uiConfig should have default', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', '..', 'static')
    }
  }

  t.plan(2)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/uiConfig'
  })

  t.equal(res.statusCode, 200)
  t.equal(res.payload, '{}')
})

test('/documentation/uiConfig can be customize', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', '..', 'static')
    },
    uiConfig: {
      docExpansion: 'full'
    }
  }

  t.plan(2)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/uiConfig'
  })

  t.equal(res.statusCode, 200)
  t.equal(res.payload, '{"docExpansion":"full"}')
})

test('/documentation/initOAuth should have default', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', '..', 'static')
    }
  }

  t.plan(2)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/initOAuth'
  })

  t.equal(res.statusCode, 200)
  t.equal(res.payload, '{}')
})

test('/documentation/initOAuth can be customize', async (t) => {
  const config = {
    exposeRoute: true,
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      baseDir: resolve(__dirname, '..', '..', 'static')
    },
    initOAuth: {
      scopes: ['openid', 'profile', 'email', 'offline_access']
    }
  }

  t.plan(2)
  const fastify = new Fastify()
  await fastify.register(fastifySwagger, config)

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/initOAuth'
  })

  t.equal(res.statusCode, 200)
  t.equal(res.payload, '{"scopes":["openid","profile","email","offline_access"]}')
})

test('should still return valid swagger object when missing package.json', async (t) => {
  const config = {
    mode: 'dynamic',
    specification: {
      path: './examples/example-static-specification.json'
    },
    exposeRoute: true
  }

  t.plan(2)
  const fastify = Fastify()
  await fastify.register(fastifySwagger, config)

  const originalPathJoin = path.join
  const testPackageJSON = path.join(__dirname, 'missing.json')

  path.join = (...args) => {
    if (args[3] === 'package.json') {
      return testPackageJSON
    }
    return originalPathJoin(...args)
  }

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(typeof swaggerObject, 'object')

  await Swagger.validate(swaggerObject)
  t.pass('Swagger object is still valid.')
})
