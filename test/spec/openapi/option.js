'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const yaml = require('js-yaml')
const fastifySwagger = require('../../../index')
const { readPackageJson } = require('../../../lib/util/common')
const { openapiOption } = require('../../../examples/options')

test('openapi should have default version', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, { openapi: {} })

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(openapiObject.openapi, '3.0.3')
  })
})

test('openapi should have default info properties', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, { openapi: {} })

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const pkg = readPackageJson(function () {})
    t.equal(openapiObject.info.title, pkg.name)
    t.equal(openapiObject.info.version, pkg.version)
  })
})

test('openapi basic properties', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

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

    const openapiObject = fastify.swagger()
    t.equal(openapiObject.info, openapiOption.openapi.info)
    t.equal(openapiObject.servers, openapiOption.openapi.servers)
    t.ok(openapiObject.paths)
    t.ok(openapiObject.paths['/'])
  })
})

test('openapi components', t => {
  t.plan(2)
  const fastify = Fastify()

  openapiOption.openapi.components.schemas = {
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

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.same(openapiObject.components.schemas, openapiOption.openapi.components.schemas)
    delete openapiOption.openapi.components.schemas // remove what we just added
  })
})

test('hide support when property set in transform() - property', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    ...openapiOption,
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

    const openapiObject = fastify.swagger()
    t.notOk(openapiObject.paths['/'])
  })
})

test('hide support - tags Default', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

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

    const openapiObject = fastify.swagger()
    t.notOk(openapiObject.paths['/'])
  })
})

test('hide support - tags Custom', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, { ...openapiOption, hiddenTag: 'NOP' })

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

    const openapiObject = fastify.swagger()
    t.notOk(openapiObject.paths['/'])
  })
})

test('hide support - hidden untagged', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, { ...openapiOption, hideUntagged: true })

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

    const openapiObject = fastify.swagger()
    t.notOk(openapiObject.paths['/'])
  })
})

test('basePath support', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost/prefix'
        }
      ]
    })
  })

  fastify.get('/prefix/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.notOk(openapiObject.paths['/prefix/endpoint'])
    t.ok(openapiObject.paths['/endpoint'])
  })
})

test('basePath maintained when stripBasePath is set to false', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    stripBasePath: false,
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost/foo'
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.notOk(openapiObject.paths.endpoint)
    t.notOk(openapiObject.paths['/endpoint'])
    t.ok(openapiObject.paths['/foo/endpoint'])
  })
})

test('cache - json', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.ready(err => {
    t.error(err)

    fastify.swagger()
    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')

    Swagger.validate(openapiObject)
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

  fastify.register(fastifySwagger, openapiOption)

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

module.exports = { openapiOption }
