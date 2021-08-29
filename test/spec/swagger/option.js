'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
const fastifySwagger = require('../../../index')
const { readPackageJson } = require('../../../lib/util/common')
const { swaggerOption } = require('../../../examples/options')

test('swagger should have default version', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger)

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.swagger, '2.0')
  })
})

test('swagger should have default info properties', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger)

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    const pkg = readPackageJson(function () {})
    t.equal(swaggerObject.info.title, pkg.name)
    t.equal(swaggerObject.info.version, pkg.version)
  })
})

test('swagger basic properties', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  const opts = {
    schema: {
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
    t.equal(swaggerObject.info, swaggerOption.swagger.info)
    t.equal(swaggerObject.host, swaggerOption.swagger.host)
    t.equal(swaggerObject.schemes, swaggerOption.swagger.schemes)
    t.ok(swaggerObject.paths)
    t.ok(swaggerObject.paths['/'])
  })
})

test('swagger definitions', t => {
  t.plan(2)
  const fastify = Fastify()

  swaggerOption.swagger.definitions = {
    ExampleModel: {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
          description: 'Some id'
        },
        name: {
          type: 'string',
          description: 'Name of smthng'
        }
      }
    }
  }

  fastify.register(fastifySwagger, swaggerOption)

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.same(swaggerObject.definitions, swaggerOption.swagger.definitions)
    delete swaggerOption.swagger.definitions // remove what we just added
  })
})

test('swagger tags', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.tags, swaggerOption.swagger.tags)
  })
})

test('swagger externalDocs', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.equal(swaggerObject.externalDocs, swaggerOption.swagger.externalDocs)
  })
})

test('basePath support', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    swagger: Object.assign({}, swaggerOption.swagger, {
      basePath: '/prefix'
    })
  })

  fastify.get('/prefix/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths['/prefix/endpoint'])
    t.ok(swaggerObject.paths['/endpoint'])
  })
})

test('basePath support with prefix', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    prefix: '/prefix',
    swagger: Object.assign({}, swaggerOption.swagger, {
      basePath: '/prefix'
    })
  })

  fastify.get('/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths['/prefix/endpoint'])
    t.ok(swaggerObject.paths['/endpoint'])
  })
})

test('basePath ensure leading slash', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    swagger: Object.assign({}, swaggerOption.swagger, {
      basePath: '/'
    })
  })

  fastify.get('/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths.endpoint)
    t.ok(swaggerObject.paths['/endpoint'])
  })
})

test('basePath with prefix ensure leading slash', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    prefix: '/',
    swagger: Object.assign({}, swaggerOption.swagger, {
      basePath: '/'
    })
  })

  fastify.get('/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths.endpoint)
    t.ok(swaggerObject.paths['/endpoint'])
  })
})

test('basePath maintained when stripBasePath is set to false', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    stripBasePath: false,
    swagger: Object.assign({}, swaggerOption.swagger, {
      basePath: '/foo'
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const swaggerObject = fastify.swagger()
    t.notOk(swaggerObject.paths.endpoint)
    t.notOk(swaggerObject.paths['/endpoint'])
    t.ok(swaggerObject.paths['/foo/endpoint'])
  })
})

// hide testing

test('hide support - property', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  const opts = {
    schema: {
      hide: true,
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
    t.notOk(swaggerObject.paths['/'])
  })
})

test('hide support when property set in transform() - property', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    ...swaggerOption,
    transform: schema => {
      return { ...schema, hide: true }
    }
  })

  const opts = {
    schema: {
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
    t.notOk(swaggerObject.paths['/'])
  })
})

test('hide support - tags Default', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  const opts = {
    schema: {
      tags: ['X-HIDDEN'],
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
    t.notOk(swaggerObject.paths['/'])
  })
})

test('hide support - tags Custom', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, { ...swaggerOption, hiddenTag: 'NOP' })

  const opts = {
    schema: {
      tags: ['NOP'],
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
    t.notOk(swaggerObject.paths['/'])
  })
})

test('hide support - hidden untagged', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, { ...swaggerOption, hideUntagged: true })

  const opts = {
    schema: {
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
    t.notOk(swaggerObject.paths['/'])
  })
})

test('cache - json', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.ready(err => {
    t.error(err)

    fastify.swagger()
    const swaggerObject = fastify.swagger()
    t.equal(typeof swaggerObject, 'object')

    Swagger.validate(swaggerObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('cache - yaml', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerOption)

  fastify.ready(err => {
    t.error(err)

    fastify.swagger({ yaml: true })
    const swaggerYaml = fastify.swagger({ yaml: true })
    t.equal(typeof swaggerYaml, 'string')

    try {
      yaml.load(swaggerYaml)
      t.pass('valid swagger yaml')
    } catch (err) {
      t.fail(err)
    }
  })
})

module.exports = { swaggerOption }
