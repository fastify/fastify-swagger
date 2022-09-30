'use strict'

const path = require('path')
const { test } = require('tap')
const Fastify = require('fastify')
const fastifySwagger = require('../../index')
const fastifySwaggerDynamic = require('../../lib/mode/dynamic')
const Swagger = require('@apidevtools/swagger-parser')

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
        specification
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
    }
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
    }
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

  await fastify.ready()

  t.strictSame(fastify.swagger(), {
    swagger: '2.0',
    info: { version: '1.0.0', title: 'test' },
    definitions: {},
    paths: {}
  })
})

test('inserts default package name - openapi', async (t) => {
  const config = {
    mode: 'dynamic',
    openapi: {
      servers: []
    },
    specification: {
      path: './examples/example-static-specification.json'
    }
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

  await fastify.ready()

  t.strictSame(fastify.swagger(), {
    openapi: '3.0.3',
    info: { version: '1.0.0', title: 'test' },
    components: { schemas: {} },
    paths: {},
    servers: []
  })
})

test('throws an error if cannot parse package\'s JSON', async (t) => {
  const config = {
    mode: 'dynamic',
    specification: {
      path: './examples/example-static-specification.json'
    }
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

  await fastify.ready()

  t.strictSame(fastify.swagger(), {
    swagger: '2.0',
    info: { version: '1.0.0', title: '' },
    definitions: {},
    paths: {}
  })
})

test('throws an error if cannot parse package\'s JSON - openapi', async (t) => {
  const config = {
    mode: 'dynamic',
    openapi: {
      servers: []
    },
    specification: {
      path: './examples/example-static-specification.json'
    }
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

  await fastify.ready()

  t.strictSame(fastify.swagger(), {
    openapi: '3.0.3',
    info: { version: '1.0.0', title: '' },
    components: { schemas: {} },
    paths: {},
    servers: []
  })
})

test('inserts default opts in fastifySwaggerDynamic (dynamic.js)', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwaggerDynamic)

  t.pass('Inserted default option for fastifySwagger.')
})

test('should still return valid swagger object when missing package.json', async (t) => {
  const config = {
    mode: 'dynamic',
    specification: {
      path: './examples/example-static-specification.json'
    }
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
