import t from 'tap'
import Fastify from 'fastify'
import swaggerDefault from '../../index.js'

t.test('esm support', async t => {
  const fastify = Fastify()

  fastify.register(swaggerDefault)

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(swaggerObject.swagger, '2.0')
})
