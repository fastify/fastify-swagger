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
    transform: ({ schema, url }) => {
      return { schema: { ...schema, hide: true }, url }
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

test('transforms examples in example if single string example', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'string',
            examples: ['world']
          }
        }
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].get.requestBody.content['application/json'].schema

    t.ok(schema)
    t.notOk(schema.properties.hello.examples)
    t.equal(schema.properties.hello.example, 'world')
  })
})

test('transforms examples in example if single object example', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'object',
            properties: {
              lorem: {
                type: 'string'
              }
            },
            examples: [{ lorem: 'ipsum' }]
          }
        }
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].get.requestBody.content['application/json'].schema

    t.ok(schema)
    t.notOk(schema.properties.hello.examples)
    t.same(schema.properties.hello.example, { lorem: 'ipsum' })
  })
})

test('uses examples if has multiple string examples', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'string',
            examples: ['hello', 'world']
          }
        }
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].get.requestBody.content['application/json'].schema

    t.ok(schema)
    t.ok(schema.properties.hello.examples)
    t.same(schema.properties.hello.examples, {
      hello: {
        value: 'hello'
      },
      world: {
        value: 'world'
      }
    })
  })
})

test('uses examples if has multiple numbers examples', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'number',
            examples: [1, 2]
          }
        }
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].get.requestBody.content['application/json'].schema

    t.ok(schema)
    t.ok(schema.properties.hello.examples)
    t.same(schema.properties.hello.examples, {
      1: {
        value: 1
      },
      2: {
        value: 2
      }
    })
  })
})

test('uses examples if has multiple object examples', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'object',
            properties: {
              lorem: {
                type: 'string'
              }
            },
            examples: [{ lorem: 'ipsum' }, { hello: 'world' }]
          }
        }
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].get.requestBody.content['application/json'].schema

    t.ok(schema)
    t.ok(schema.properties.hello.examples)
    t.same(schema.properties.hello.examples, {
      example1: {
        value: {
          lorem: 'ipsum'
        }
      },
      example2: {
        value: {
          hello: 'world'
        }
      }
    })
  })
})

test('uses examples if has multiple array examples', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'array',
            items: {
              type: 'string'
            },
            examples: [['a', 'b', 'c'], ['d', 'f', 'g']]
          }
        }
      }
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].get.requestBody.content['application/json'].schema

    t.ok(schema)
    t.ok(schema.properties.hello.examples)
    t.same(schema.properties.hello.examples, {
      example1: {
        value: [
          'a',
          'b',
          'c'
        ]
      },
      example2: {
        value: [
          'd',
          'f',
          'g'
        ]
      }
    })
  })
})

test('uses examples if has property required in body', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  const body = {
    type: 'object',
    required: ['hello'],
    properties: {
      hello: {
        type: 'string'
      }
    }
  }

  const opts = {
    schema: {
      body
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].get.requestBody.content['application/json'].schema
    const requestBody = openapiObject.paths['/'].get.requestBody

    t.ok(schema)
    t.ok(schema.properties)
    t.same(body.required, ['hello'])
    t.same(requestBody.required, true)
  })
})

module.exports = { openapiOption }
