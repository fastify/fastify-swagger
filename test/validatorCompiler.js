const {
  test
} = require('tap')
const Fastify = require('fastify')
// const Swagger = require('openapi-schema-validator')
const {
  openapiOption
} = require('../examples/options')

const {
  validatorCompiler,
  fastifySwagger
} = require('../index')
test('validator compiler is function', t => {
  t.type(validatorCompiler, 'function')
  t.ok('passed validator compiler is function')
  t.end()
})

test('validator compiler working', t => {
  const fastify = Fastify()
  fastify.register(fastifySwagger, openapiOption)
  fastify.post('/', {
    schema: {
      type: 'object',
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          upload: {
            type: 'file',
            format: 'binary'
          }
        }
      }
    }

  }, () => {})

  fastify.ready(err => {
    if (err) {
      t.error(err)
    } else {
      t.ok('passed validator compiler working')
      t.end()
    }
  })
})
