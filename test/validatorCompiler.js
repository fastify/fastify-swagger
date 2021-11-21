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
      consumes: ['multipart/form-data', 'application/json'],
      body: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string'
          },
          upload: {
            type: 'file',
            format: 'binary'
          }
        }
      }
    }

  }, (req, res) => {
    return {
      status: 'success',
      code: 200,
      msg: 'operation completed successfully'
    }
  })

  fastify.ready(() => {
    fastify.inject({
      method: 'POST',
      url: '/',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        fileName: 'aditya_picture'
      }
    }, (err, res) => {
      const data = res.json()
      t.error(err)
      t.equal(data.code, 200)
      t.same(data, { status: 'success', code: 200, msg: 'operation completed successfully' })
      t.end()
    })
  })
})
