'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifySwagger = require('../index')

test('fastify.swagger should exist', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger)

  await fastify.ready()
  t.ok(fastify.swagger)
})
