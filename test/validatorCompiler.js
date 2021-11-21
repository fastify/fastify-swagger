const {
  test
} = require('tap')
const Fastify = require('fastify')
const {
  openapiOption
} = require('../examples/options')

const {
  validatorCompiler,
  fastifySwagger
} = require('../index')

const { binaryValidation, byteValidation, int32bitValidation, int64bitValidation } = require('../lib/validatorCompiler')

test('validator compiler is function', t => {
  t.type(validatorCompiler, 'function')
  t.ok('passed validator compiler is function')
  t.end()
})

test('binary validation', t => {
  const data = binaryValidation('0100110001')
  if (data) {
    t.pass()
  } else {
    t.fail()
  }
  t.end()
})

test('byte validation', t => {
  const byteData = 'MTIz'
  const data1 = byteValidation(byteData)
  const data2 = byteValidation('abc')

  if (data1) {
    t.pass()
  } else {
    t.fail()
  }

  if (!data2) {
    t.pass()
  } else {
    t.fail()
  }

  const data3 = byteValidation('QCPvv6VAI++/pQ==')

  if (data3) {
    t.pass()
  } else {
    t.fail()
  }
  t.end()
})

test('int 32 bit validation', t => {
  const data = int32bitValidation('123')
  if (data) {
    t.pass()
  } else {
    t.fail()
  }
  t.end()
})

test('int 64 bit validation', t => {
  const data = int64bitValidation('512')
  if (data) {
    t.pass()
  } else {
    t.fail()
  }
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
    t.error(err)
    t.end()
  })
})
