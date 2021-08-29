import t from 'tap'
import Fastify from 'fastify'
import fastifySwagger from '../../index.js'

t.test('esm support', async t => {
  const fastify = Fastify()

  fastify.register(fastifySwagger)

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(swaggerObject.swagger, '2.0')
})
