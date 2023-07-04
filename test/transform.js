'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifySwagger = require('..')
const Joi = require('joi')
const Convert = require('joi-to-json')

const params = Joi
  .object()
  .keys({
    property: Joi.string().required()
  })
const opts = {
  schema: { params }
}
const convertible = ['params', 'body', 'querystring']
const valid = {
  transform: ({ schema, url }) => {
    const newSchema = Object.keys(schema).reduce((transformed, key) => {
      transformed[key] = convertible.includes(key)
        ? Convert(schema[key])
        : schema[key]
      return transformed
    },
    {})
    return { schema: newSchema, url }
  }
}
const invalid = {
  transform: 'wrong type'
}

test('transform should fail with a value other than Function', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, invalid)

  fastify.setValidatorCompiler(({ schema }) => params.validate(schema))
  fastify.get('/example', opts, () => {})

  await fastify.ready()
  t.throws(fastify.swagger)
})

test('transform should work with a Function', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, valid)

  fastify.setValidatorCompiler(({ schema }) => params.validate(schema))
  fastify.get('/example', opts, () => {})

  await fastify.ready()
  t.doesNotThrow(fastify.swagger)
})

test('transform can access route', async (t) => {
  t.plan(5)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    openapi: { info: { version: '1.0.0' } },
    transform: ({ route }) => {
      t.ok(route)
      t.equal(route.method, 'GET')
      t.equal(route.url, '/example')
      t.equal(route.constraints.version, '1.0.0')
      return { schema: route.schema, url: route.url }
    }
  })
  fastify.get('/example', { constraints: { version: '1.0.0' } }, () => {})

  await fastify.ready()
  t.doesNotThrow(fastify.swagger)
})

test('transform can access openapi object', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    openapi: { info: { version: '1.0.0' } },
    transform: ({ route, openapiObject }) => {
      t.ok(openapiObject)
      t.equal(openapiObject.openapi, '3.0.3')
      t.equal(openapiObject.info.version, '1.0.0')
      return {
        schema: route.schema,
        url: route.url
      }
    }
  })
  fastify.get('/example', () => {})

  await fastify.ready()
  t.doesNotThrow(fastify.swagger)
})

test('transform can access swagger object', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    swagger: { info: { version: '1.0.0' } },
    transform: ({ route, swaggerObject }) => {
      t.ok(swaggerObject)
      t.equal(swaggerObject.swagger, '2.0')
      t.equal(swaggerObject.info.version, '1.0.0')
      return {
        schema: route.schema,
        url: route.url
      }
    }
  })
  fastify.get('/example', () => {})

  await fastify.ready()
  t.doesNotThrow(fastify.swagger)
})
