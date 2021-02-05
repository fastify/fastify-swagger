const swaggerOption = {
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    host: 'localhost',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'tag' }
    ],
    externalDocs: {
      description: 'Find more info here',
      url: 'https://swagger.io'
    },
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    },
    security: [{
      apiKey: []
    }]
  }
}

const openapiOption = {
  openapi: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    servers: [
      {
        url: 'http://localhost'
      }
    ],
    tags: [
      { name: 'tag' }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'header'
        }
      }
    },
    security: [{
      apiKey: []
    }],
    externalDocs: {
      description: 'Find more info here',
      url: 'https://swagger.io'
    }
  }
}

const schemaQuerystring = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    querystring: {
      hello: { type: 'string' },
      world: { type: 'string' }
    }
  }
}

const schemaBody = {
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
      },
      required: ['hello']
    }
  }
}

const schemaParams = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'user id'
        }
      }
    }
  }
}

const schemaHeaders = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {
          type: 'string',
          description: 'api token'
        }
      },
      required: ['authorization']
    }
  }
}

const schemaHeadersParams = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        'x-api-token': {
          type: 'string',
          description: 'optional api token'
        },
        'x-api-version': {
          type: 'string',
          description: 'optional api version'
        }
      }
    },
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'user id'
        }
      }
    }
  }
}

const schemaSecurity = {
  schema: {
    security: [
      {
        apiKey: []
      }
    ]
  }
}

const schemaConsumes = {
  schema: {
    consumes: ['application/x-www-form-urlencoded'],
    body: {
      type: 'object',
      properties: {
        hello: {
          description: 'hello',
          type: 'string'
        }
      },
      required: ['hello']
    }
  }
}

const schemaProduces = {
  schema: {
    produces: ['*/*'],
    response: {
      200: {
        type: 'object',
        properties: {
          hello: {
            description: 'hello',
            type: 'string'
          }
        },
        required: ['hello']
      }
    }
  }
}

const schemaCookies = {
  schema: {
    cookies: {
      type: 'object',
      properties: {
        bar: { type: 'string' }
      }
    }
  }
}

const schemaAllOf = {
  schema: {
    querystring: {
      allOf: [
        {
          type: 'object',
          properties: {
            foo: { type: 'string' }
          }
        }
      ]
    }
  }
}

const schemaExtension = {
  schema: {
    'x-tension': true
  }
}

module.exports = {
  openapiOption,
  swaggerOption,
  schemaQuerystring,
  schemaBody,
  schemaParams,
  schemaHeaders,
  schemaHeadersParams,
  schemaSecurity,
  schemaConsumes,
  schemaProduces,
  schemaCookies,
  schemaAllOf,
  schemaExtension
}
