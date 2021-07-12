# fastify-swagger

[![NPM version](https://img.shields.io/npm/v/fastify-swagger.svg?style=flat)](https://www.npmjs.com/package/fastify-swagger)
![CI workflow](https://github.com/fastify/fastify-swagger/workflows/CI%20workflow/badge.svg)
[![Known Vulnerabilities](https://snyk.io/test/github/fastify/fastify-swagger/badge.svg)](https://snyk.io/test/github/fastify/fastify-swagger)
[![Coverage Status](https://coveralls.io/repos/github/fastify/fastify-swagger/badge.svg?branch=master)](https://coveralls.io/github/fastify/fastify-swagger?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

A Fastify plugin for serving a [Swagger UI](https://swagger.io/tools/swagger-ui/), using [Swagger (OpenAPI v2)](https://swagger.io/specification/v2/) or [OpenAPI v3](https://swagger.io/specification) schemas automatically generated from your route schemas, or from an existing Swagger/OpenAPI schema.

Supports Fastify versions `>=3.0.0`. For `fastify@2`, please refer to [`branch@2.x`](https://github.com/fastify/fastify-swagger/tree/2.x) and for `fastify@1.9`, please refer to [`branch@1.x`](https://github.com/fastify/fastify-swagger/tree/1.x).

If you are looking for a plugin to generate routes from an existing OpenAPI schema, check out [fastify-swaggergen](https://github.com/seriousme/fastify-swaggergen).

<a name="install"></a>
## Install
```
npm i fastify-swagger --save
```

<a name="usage"></a>
## Usage
Add it to your project with `register`, pass it some options, call the `swagger` API, and you are done!

```js
const fastify = require('fastify')()

fastify.register(require('fastify-swagger'), {
  routePrefix: '/documentation',
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'Testing the Fastify swagger API',
      version: '0.1.0'
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here'
    },
    host: 'localhost',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'user', description: 'User related end-points' },
      { name: 'code', description: 'Code related end-points' }
    ],
    definitions: {
      User: {
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: {type: 'string', format: 'email' }
        }
      }
    },
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    }
  },
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  exposeRoute: true
})

fastify.put('/some-route/:id', {
  schema: {
    description: 'post some data',
    tags: ['user', 'code'],
    summary: 'qwerty',
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'user id'
        }
      }
    },
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
    },
    response: {
      201: {
        description: 'Successful response',
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    security: [
      {
        "apiKey": []
      }
    ]
  }
}, (req, reply) => {})

fastify.ready(err => {
  if (err) throw err
  fastify.swagger()
})
```
<a name="api"></a>
## API

<a name="register.options"></a>
### Register options

<a name="register.options.modes"></a>
#### Modes
`fastify-swagger` supports two registration modes `dynamic` and `static`:

<a name="register.options.mode.dynamic"></a>
##### Dynamic
`dynamic` is the default mode, if you use `fastify-swagger` this way API schemas will be auto-generated from route schemas:
```js
// All of the below parameters are optional but are included for demonstration purposes
{
  // swagger 2.0 options
  swagger: {
    info: {
      title: String,
      description: String,
      version: String
    },
    externalDocs: Object,
    host: String,
    schemes: [ String ],
    consumes: [ String ],
    produces: [ String ],
    tags: [ Object ],
    securityDefinitions: Object
  },
  // openapi 3.0.3 options
  // openapi: {
  //   info: {
  //     title: String,
  //     description: String,
  //     version: String,
  //   },
  //   externalDocs: Object,
  //   servers: [ Object ],
  //   components: Object,
  //   security: [ Object ],
  //   tags: [ Object ]
  // }
}
```

All properties detailed in the [Swagger (OpenAPI v2)](https://swagger.io/specification/v2/) and [OpenAPI v3](https://swagger.io/specification/) specifications can be used.
`fastify-swagger` will generate API schemas that adhere to the Swagger specification by default.
If provided an `openapi` option it will generate OpenAPI compliant API schemas instead.

Examples of using `fastify-swagger` in `dynamic` mode:
- [Using the `swagger` option](examples/dynamic-swagger.js)
- [Using the `openapi` option](examples/dynamic-openapi.js)

<a name="register.options.mode.static"></a>
##### Static
 `static` mode must be configured explicitly. In this mode `fastify-swagger` serves an already existing Swagger or OpenAPI schema that is passed to it in `specification.path`:

```js
{
  mode: 'static',
  specification: {
    path: './examples/example-static-specification.yaml',
    postProcessor: function(swaggerObject) {
      return swaggerObject
    },
    baseDir: '/path/to/external/spec/files/location',
  },
}
```

The `specification.postProcessor` parameter is optional. It allows you to change your Swagger object on the fly (for example - based on the environment).
It accepts `swaggerObject` - a JavaScript object that was parsed from your `yaml` or `json` file and should return a Swagger schema object.

`specification.baseDir` allows specifying the directory where all spec files that are included in the main one using `$ref` will be located.
By default, this is the directory where the main spec file is located. Provided value should be an absolute path **without** trailing slash.

An example of using `fastify-swagger` with `static` mode enabled can be found [here](examples/static-file.js).

#### Options

 | Option             | Default          | Description                                                                                                               |
 | ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
 | exposeRoute        | false            | Exposes documentation route.                                                                                              |
 | hiddenTag          | X-HIDDEN         | Tag to control hiding of routes.                                                                                          |
 | hideUntagged       | false            | If `true` remove routes without tags from resulting Swagger/OpenAPI schema file.                                          |
 | initOAuth          | {}               | Configuration options for [Swagger UI initOAuth](https://swagger.io/docs/open-source-tools/swagger-ui/usage/oauth2/).     |
 | openapi            | {}               | [OpenAPI configuration](https://swagger.io/specification/#oasObject).                                                     |
 | routePrefix        | '/documentation' | Overwrite the default Swagger UI route prefix.                                                                            |
 | staticCSP          | false            | Enable CSP header for static resources.                                                                                   |
 | stripBasePath      | true             | Strips base path from routes in docs.                                                                                     |
 | swagger            | {}               | [Swagger configuration](https://swagger.io/specification/v2/#swaggerObject).                                              |
 | transform          | null             | Transform method for schema.                                                                                              |
 | transformStaticCSP | undefined        | Synchronous function to transform CSP header for static resources if the header has been previously set.                  |
 | uiConfig           | {}               | Configuration options for [Swagger UI](https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md). Must be literal values, see [#5710](https://github.com/swagger-api/swagger-ui/issues/5710).|

If you set `exposeRoute` to `true` the plugin will expose the documentation with the following APIs:

| URL                     | Description                                |
| ----------------------- | ------------------------------------------ |
| `'/documentation/json'` | The JSON object representing the API       |
| `'/documentation/yaml'` | The YAML object representing the API       |
| `'/documentation/'`     | The swagger UI                             |
| `'/documentation/*'`    | External files that you may use in `$ref`  |

<a name="register.options.transform"></a>
#### Transforms

To use different schemas such as [Joi](https://github.com/hapijs/joi) you can pass a synchronous `transform` method in the options to convert them back to standard JSON schemas expected by this plugin to generate the documentation (`dynamic` mode only).

```js
const convert = require('joi-to-json')

fastify.register(require('fastify-swagger'), {
  swagger: { ... },
  ...
  transform: schema => {
    const {
      params = undefined,
      body = undefined,
      querystring = undefined,
      ...others
    } = schema
    const transformed = { ...others }
    if (params) transformed.params = convert(params)
    if (body) transformed.body = convert(body)
    if (querystring) transformed.querystring = convert(querystring)
    return transformed
  }
}
```

<a name="route.options"></a>
### Route options

<a name="route.response.options"></a>
#### Response Options

<a name="route.response.description"></a>
##### Response description and response body description
`description` is a required field as per the Swagger specification. If it is not provided then the plugin will automatically generate one with the value `'Default Response'`.
If you supply a `description` it will be used for both the response and response body schema, for example:

```js
fastify.get('/description', {
  schema: {
    response: {
      200: {
        description: 'response and schema description',
        type: 'string'
      }
    }
  }
}, () => {})
```

Generates this in a Swagger (OpenAPI v2) schema's `paths`:

```json
{
  "/description": {
    "get": {
      "responses": {
        "200": {
          "description": "response and schema description",
          "schema": {
            "description": "response and schema description",
            "type": "string"
          }
        }
      }
    }
  }
}
```

And this in a OpenAPI v3 schema's `paths`:

```json
{
  "/description": {
    "get": {
      "responses": {
        "200": {
          "description": "response and schema description",
          "content": {
            "application/json": {
              "schema": {
                "description": "response and schema description",
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
}
```

If you want to provide different descriptions for the response and response body, use the `x-response-description` field alongside `description`:

```js
fastify.get('/responseDescription', {
  schema: {
    response: {
      200: {
        'x-response-description': 'response description',
        description: 'schema description',
        type: 'string'
      }
    }
  }
}, () => {})
```
<a name="route.response.2xx"></a>
##### Status code 2xx
Fastify supports both the `2xx` and `3xx` status codes, however Swagger (OpenAPI v2) itself does not.
`fastify-swagger` transforms `2xx` status codes into `200`, but will omit it if a `200` status code has already been declared.
OpenAPI v3 [supports the `2xx` syntax](https://swagger.io/specification/#http-codes) so is unaffected.

Example:

```js
{
  response: {
    '2xx': {
      description: '2xx'
      type: 'object'
    }
  }
}

// will become
{
  response: {
    200: {
      schema: {
        description: '2xx'
        type: 'object'
      }
    }
  }
}
```
<a name="route.response.headers"></a>
##### Response headers
You can decorate your own response headers by following the below example:

```js
{
  response: {
    200: {
      type: 'object',
      headers: {
        'X-Foo': {
          type: 'string'
        }
      }
    }
  }
}
```
Note: You need to specify `type` property when you decorate the response headers, otherwise the schema will be modified by Fastify.

<a name="route.response.empty_body"></a>
##### Empty Body Responses
Empty body responses are supported by `fastify-swagger`.
Please specify `type: 'null'` for the response otherwise Fastify itself will fail to compile the schema:

```js
{
  response: {
    204: {
      type: 'null',
      description: 'No Content'
    },
    503: {
      type: 'null',
      description: 'Service Unavailable'
    }
  }
}
```

<a name="route.openapi"></a>
#### OpenAPI Parameter Options

**Note:** OpenAPI's terminology differs from Fastify's. OpenAPI uses "parameter" to refer to parts of a request that in [Fastify's validation documentation](https://www.fastify.io/docs/latest/Validation-and-Serialization/#validation) are called "querystring", "params", and "headers".

OpenAPI provides some options beyond those provided by the [JSON schema specification](https://json-schema.org/specification.html) for specifying the shape of parameters. A prime example of this is the `collectionFormat` option for specifying how to encode parameters that should be handled as arrays of values.

These encoding options only change how Swagger UI presents its documentation and how it generates `curl` commands when the `Try it out` button is clicked.
Depending on which options you set in your schema, you *may also need* to change the default query string parser used by Fastify so that it produces a JavaScript object that will conform to the schema.
As far as arrays are concerned, the default query string parser conforms to the `collectionFormat: "multi"` specification.
If you were to select `collectionFormat: "csv"`, you would have to replace the default query string parser with one that parses CSV parameter values into arrays.
The same applies to the other parts of a request that OpenAPI calls "parameters" and which are not encoded as JSON in a request.

`fastify-swagger` supports these options as shown in this example:

```js
fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    querystring: {
      type: 'object',
      required: ['fields'],
      additionalProperties: false,
      properties: {
        fields: {
          type: 'array',
          items: {
            type: 'string'
          },
          minItems: 1,
          //
          // Note that this is an OpenAPI version 2 configuration option. The
          // options changed in version 3.
          //
          // Put `collectionFormat` on the same property which you are defining
          // as an array of values. (i.e. `collectionFormat` should be a sibling
          // of the `type: "array"` specification.)
          collectionFormat: 'multi'
        }
      }
    }
  },
  handler (request, reply) {
    reply.send(request.query.fields)
  }
})
```

There is a complete runnable example [here](examples/collection-format.js).

<a name="route.complex-serialization"></a>
#### Complex serialization in query and cookie, eg. JSON

**Note:** not supported by Swagger (OpenAPI v2), [only OpenAPI v3](https://swagger.io/docs/specification/describing-parameters/#schema-vs-content)

```
http://localhost/?filter={"foo":"baz","bar":"qux"}
```

**IMPORTANT CAVEAT** You will need to change the default query string parser used by Fastify so that it produces a JavaScript object that will conform to the schema. See [example](examples/json-in-querystring.js).

```js
fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    querystring: {
      type: 'object',
      required: ['filter'],
      additionalProperties: false,
      properties: {
        filter: {
          type: 'object',
          required: ['foo'],
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' }
          },
          'x-consume': 'application/json'
        }
      }
    }
  },
  handler (request, reply) {
    reply.send(request.query.filter)
  }
})
```

Will generate this in the OpenAPI v3 schema's `paths`:

```json
{
  "/": {
    "get": {
      "parameters": [
        {
          "in": "query",
          "name": "filter",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "foo"
                ],
                "properties": {
                  "foo": {
                    "type": "string"
                  },
                  "bar": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      ]
    }
  }
}
```

<a name="route.links"></a>
#### Links

**Note:** not supported by Swagger (OpenAPI v2), [only OpenAPI v3](https://swagger.io/docs/specification/links/)

OpenAPI v3 Links are added by adding a `links` property to the top-level options of a route. See:

```js
fastify.get('/user/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'the user identifier, as userId'
        }
      },
      required: ['id']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          uuid: {
            type: 'string',
            format: 'uuid'
          }
        }
      }
    }
  },
  links: {
    // The status code must match the one in the response
    200: {
      address: {
        // See the OpenAPI documentation
        operationId: 'getUserAddress',
        parameters: {
          id: '$request.path.id'
        }
      }
    }
  }
}, () => {})

fastify.get('/user/:id/address', {
  schema: {
    operationId: 'getUserAddress',
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'the user identifier, as userId'
        }
      },
      required: ['id']
    },
    response: {
      200: {
        type: 'string'
      }
    }
  }
}, () => {})
```

<a name="route.hide"></a>
#### Hide a route
There are two ways to hide a route from the Swagger UI:
- Pass `{ hide: true }` to the schema object inside the route declaration.
- Use the tag declared in `hiddenTag` options property inside the route declaration. Default is `X-HIDDEN`.

<a name="function.options"></a>
### Swagger function options

Registering `fastify-swagger` decorates the fastify instance with `fastify.swagger()`, which returns a JSON object representing the API.
If `{ yaml: true }` is passed to `fastify.swagger()` it will return a YAML string.

<a name="integration"></a>
### Integration
You can integration this plugin with ```fastify-helmet``` with some little work.

```fastify-helmet``` options example:
```javascript
.register(helmet, instance => {
  return {
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "form-action": ["'self'"],
        "img-src": ["'self'", "data:", "validator.swagger.io"],
        "script-src": ["'self'"].concat(instance.swaggerCSP.script),
        "style-src": ["'self'", "https:"].concat(
          instance.swaggerCSP.style
        ),
      }
    }
  }
})
```

<a name="development"></a>
### Development
In order to start development run:
```
npm i
npm run prepare
```

So that [swagger-ui](https://github.com/swagger-api/swagger-ui) static folder will be generated for you.

#### How it works under the hood

`fastify-static` serves `swagger-ui` static files, then calls `/docs/json` to get the Swagger file and render it.

<a name="acknowledgements"></a>
## Acknowledgements

This project is kindly sponsored by:
- [nearForm](https://nearform.com)
- [LetzDoIt](https://www.letzdoitapp.com/)

<a name="license"></a>
## License

Licensed under [MIT](./LICENSE).
