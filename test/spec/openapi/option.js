'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const yaml = require('yaml')
const fastifySwagger = require('../../../index')
const { readPackageJson } = require('../../../lib/util/common')
const { openapiOption } = require('../../../examples/options')

test('openapi should have default version', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: {} })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(openapiObject.openapi, '3.0.3')
})

test('openapi version can be overridden', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: { openapi: '3.1.0' } })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(openapiObject.openapi, '3.1.0')
})

test('openapi should have default info properties', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: {} })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const pkg = readPackageJson()
  t.equal(openapiObject.info.title, pkg.name)
  t.equal(openapiObject.info.version, pkg.version)
})

test('openapi basic properties', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(openapiObject.info, openapiOption.openapi.info)
  t.equal(openapiObject.servers, openapiOption.openapi.servers)
  t.ok(openapiObject.paths)
  t.ok(openapiObject.paths['/'])
})

test('openapi components', async (t) => {
  t.plan(1)
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

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.same(openapiObject.components.schemas, openapiOption.openapi.components.schemas)
  delete openapiOption.openapi.components.schemas // remove what we just added
})

test('hide support when property set in transform() - property', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths['/'])
})

test('hide support - tags Default', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths['/'])
})

test('hide support - tags Custom', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { ...openapiOption, hiddenTag: 'NOP' })

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths['/'])
})

test('hide support - hidden untagged', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { ...openapiOption, hideUntagged: true })

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths['/'])
})

test('basePath support', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost/prefix'
        }
      ]
    })
  })

  fastify.get('/prefix/endpoint', {}, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths['/prefix/endpoint'])
  t.ok(openapiObject.paths['/endpoint'])
})

test('basePath maintained when stripBasePath is set to false', async (t) => {
  t.plan(3)

  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
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

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths.endpoint)
  t.notOk(openapiObject.paths['/endpoint'])
  t.ok(openapiObject.paths['/foo/endpoint'])
})

test('relative basePath support', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: '/foo'
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths['/foo/endpoint'])
  t.ok(openapiObject.paths['/endpoint'])
})

test('basePath containing variables support', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost:{port}/{basePath}',
          variables: {
            port: {
              default: 8080
            },
            basePath: {
              default: 'foo'
            }
          }
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.notOk(openapiObject.paths['/foo/endpoint'])
  t.ok(openapiObject.paths['/endpoint'])
})

test('throw when a basePath with variables but no corresponding default values is provided', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost/{basePath}/foo',
          variables: {
            basePath: {}
          }
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  await fastify.ready()
  t.throws(fastify.swagger)
})

test('cache - json', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  await fastify.ready()

  fastify.swagger()
  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
})

test('cache - yaml', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  await fastify.ready()

  fastify.swagger({ yaml: true })
  const swaggerYaml = fastify.swagger({ yaml: true })
  t.equal(typeof swaggerYaml, 'string')
  yaml.parse(swaggerYaml)
  t.pass('valid swagger yaml')
})

test('transforms examples in example if single string example', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema

  t.ok(schema)
  t.same(schema.properties.hello.examples, ['world'])
})

test('transforms examples in example if single object example', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema

  t.ok(schema)
  t.same(schema.properties.hello.examples, [{ lorem: 'ipsum' }])
})

test('move examples from "x-examples" to examples field', async (t) => {
  t.plan(3)
  const fastify = Fastify({
    ajv: {
      plugins: [
        function (ajv) {
          ajv.addKeyword({ keyword: 'x-examples' })
        }
      ]
    }
  })

  await fastify.register(fastifySwagger, openapiOption)

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
            }
          }
        },
        'x-examples': {
          'lorem ipsum': {
            summary: 'Roman statesman',
            value: { lorem: 'ipsum' }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.requestBody.content['application/json']
  const schema = content.schema

  t.ok(schema)
  t.notOk(schema['x-examples'])
  t.same(content.examples, {
    'lorem ipsum': {
      summary: 'Roman statesman',
      value: { lorem: 'ipsum' }
    }
  })
})

test('copy example of body from component to media', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const body = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }]
  }

  const opts = {
    schema: {
      body
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.requestBody.content['application/json']
  const schema = content.schema

  t.ok(schema)
  t.ok(schema.properties)
  t.notOk(schema.example)
  t.same(content.example, { hello: 'world' })
})

test('copy example of response from component to media', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const response = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }]
  }

  const opts = {
    schema: {
      response: { 200: response }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
  const schema = content.schema

  t.ok(schema)
  t.ok(schema.properties)
  t.same(content.example, { hello: 'world' })
})

test('copy example of parameters from component to media', async (t) => {
  t.plan(7)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const portSchema = {
    type: 'number',
    examples: [8080]
  }

  const opts = {
    schema: {
      headers: {
        'X-Port': portSchema
      },
      querystring: {
        port: portSchema
      },
      params: {
        port: portSchema
      }
    }
  }

  fastify.post('/:port', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const parameters = openapiObject.paths['/{port}'].post.parameters

  t.ok(parameters)

  const paramsMap = new Map(parameters.map(param => [param.in, param]))

  const headerParam = paramsMap.get('header')
  t.ok(headerParam)
  t.same(headerParam.example, 8080)

  const queryParam = paramsMap.get('query')
  t.ok(queryParam)
  t.same(queryParam.example, 8080)

  const pathParam = paramsMap.get('path')
  t.ok(pathParam)
  t.same(pathParam.example, 8080)
})

test('move examples of body from component to media', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const body = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }, { hello: 'lorem' }]
  }

  const opts = {
    schema: {
      body
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.requestBody.content['application/json']
  const schema = content.schema

  t.ok(schema)
  t.ok(schema.properties)
  t.notOk(schema.examples)
  t.same(content.examples, { example1: { value: { hello: 'world' } }, example2: { value: { hello: 'lorem' } } })
})

test('move examples of response from component to media', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const response = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }, { hello: 'lorem' }]
  }

  const opts = {
    schema: {
      response: { 200: response }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
  const schema = content.schema

  t.ok(schema)
  t.ok(schema.properties)
  t.notOk(schema.examples)
  t.same(content.examples, { example1: { value: { hello: 'world' } }, example2: { value: { hello: 'lorem' } } })
})

test('move examples of parameters from component to media', async (t) => {
  t.plan(7)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const portSchema = {
    type: 'number',
    examples: [8080, 80]
  }

  const opts = {
    schema: {
      headers: {
        'X-Port': portSchema
      },
      querystring: {
        port: portSchema
      },
      params: {
        port: portSchema
      }
    }
  }

  fastify.post('/:port', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const parameters = openapiObject.paths['/{port}'].post.parameters

  t.ok(parameters)

  const paramsMap = new Map(parameters.map(param => [param.in, param]))

  const expectedExamples = {
    80: { value: 80 },
    8080: { value: 8080 }
  }

  const headerParam = paramsMap.get('header')
  t.ok(headerParam)
  t.same(headerParam.examples, expectedExamples)

  const queryParam = paramsMap.get('query')
  t.ok(queryParam)
  t.same(queryParam.examples, expectedExamples)

  const pathParam = paramsMap.get('path')
  t.ok(pathParam)
  t.same(pathParam.examples, expectedExamples)
})

test('uses examples if has multiple string examples', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema

  t.ok(schema)
  t.ok(schema.properties.hello.examples)
  t.same(schema.properties.hello.examples, ['hello', 'world'])
})

test('uses examples if has multiple numbers examples', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema

  t.ok(schema)
  t.ok(schema.properties.hello.examples)
  t.same(schema.properties.hello.examples, [1, 2])
})

test('uses examples if has multiple object examples', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema

  t.ok(schema)
  t.ok(schema.properties.hello.examples)
  t.same(schema.properties.hello.examples, [
    { lorem: 'ipsum' },
    { hello: 'world' }
  ])
})

test('uses examples if has multiple array examples', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema

  t.ok(schema)
  t.ok(schema.properties.hello.examples)
  t.same(schema.properties.hello.examples, [
    ['a', 'b', 'c'],
    ['d', 'f', 'g']
  ])
})

test('uses examples if has property required in body', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

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

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema
  const requestBody = openapiObject.paths['/'].post.requestBody

  t.ok(schema)
  t.ok(schema.properties)
  t.same(body.required, ['hello'])
  t.same(requestBody.required, true)
})

module.exports = { openapiOption }
