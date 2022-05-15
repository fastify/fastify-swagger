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
