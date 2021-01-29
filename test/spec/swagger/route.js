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
    t.is(typeof swaggerYaml, 'string')

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
  t.plan(8)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

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
