'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifySwagger = require('../index')
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
  transform: schema => Object.keys(schema).reduce((transformed, key) => {
    transformed[key] = convertible.includes(key)
      ? Convert(schema[key])
      : schema[key]
    return transformed
  },
  {})
}

const invalid = {
  transform: 'wrong type'
}

test('transform should fail with a value other than Function', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, invalid)

  fastify.setValidatorCompiler(({ schema }) => Joi.validate(schema))
  fastify.get('/example', opts, () => {})

  fastify.ready(err => {
    t.error(err)
    t.throws(fastify.swagger)
  })
})

test('transform should work with a Function', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, valid)

  fastify.setValidatorCompiler(({ schema }) => Joi.validate(schema))
  fastify.get('/example', opts, () => {})

  fastify.ready(err => {
    t.error(err)
    t.doesNotThrow(fastify.swagger)
  })
})

test('transform should work with an AsyncFunction for openapi', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    openapi: {},
    transform: async schema => valid.transform(schema)
  })

  fastify.setValidatorCompiler(({ schema }) => Joi.validate(schema))
  fastify.get('/example', opts, () => {})

  await fastify.ready()
  const openapiObject = await fastify.swagger()

  t.ok(openapiObject.paths)
  t.ok(openapiObject.paths['/example'])
  t.same(openapiObject.paths['/example'].get.parameters, [
    {
      in: 'path',
      name: 'property',
      required: true,
      schema: { type: 'string' }
    }
  ])
})

test('openapi should skip untagged routes', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    openapi: {},
    transform: async schema => valid.transform(schema),
    hideUntagged: true
  })

  fastify.setValidatorCompiler(({ schema }) => Joi.validate(schema))
  fastify.get('/example', opts, () => {})

  await fastify.ready()
  const openapiObject = await fastify.swagger()

  t.ok(openapiObject.paths)
  t.same(openapiObject.paths, {})
})

test('transform should work with an AsyncFunction for swagger', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    swagger: {},
    transform: async schema => valid.transform(schema)
  })

  fastify.setValidatorCompiler(({ schema }) => Joi.validate(schema))
  fastify.get('/example', opts, () => {})

  await fastify.ready()
  const swaggerObject = await fastify.swagger()

  t.ok(swaggerObject.paths)
  t.ok(swaggerObject.paths['/example'])
  t.same(swaggerObject.paths['/example'].get.parameters, [
    {
      in: 'path',
      name: 'property',
      required: true,
      type: 'string'
    }
  ])
})

test('async transform for swagger should skip untagged routes', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    swagger: {},
    transform: async schema => valid.transform(schema),
    hideUntagged: true
  })

  fastify.setValidatorCompiler(({ schema }) => Joi.validate(schema))
  fastify.get('/example', opts, () => {})

  await fastify.ready()
  const swaggerObject = await fastify.swagger()

  t.ok(swaggerObject.paths)
  t.same(swaggerObject.paths, {})
})
