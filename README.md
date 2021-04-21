# fastify-swagger

[![NPM version](https://img.shields.io/npm/v/fastify-swagger.svg?style=flat)](https://www.npmjs.com/package/fastify-swagger)
![CI workflow](https://github.com/fastify/fastify-swagger/workflows/CI%20workflow/badge.svg)
[![Known Vulnerabilities](https://snyk.io/test/github/fastify/fastify-swagger/badge.svg)](https://snyk.io/test/github/fastify/fastify-swagger)
[![Coverage Status](https://coveralls.io/repos/github/fastify/fastify-swagger/badge.svg?branch=master)](https://coveralls.io/github/fastify/fastify-swagger?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

Serve [Swagger](https://swagger.io/specification/v2/) / [OpenAPI](https://swagger.io/specification) for Fastify.
It can either use the schemas you declare in your routes to dynamically generate an OpenAPI/Swagger-compliant doc, or serve a static OpenAPI specification document.

Supports Fastify versions `>=3.0.0`. For `fastify@2`, please refer to [`branch@2.x`](https://github.com/fastify/fastify-swagger/tree/2.x) and for `fastify@1.9`, please refer to [`branch@1.x`](https://github.com/fastify/fastify-swagger/tree/1.x).

<a name="install"></a>
## Install
```
npm i fastify-swagger --save
```

<a name="usage"></a>
## Usage
Add it to your project with `register` and pass it some basic options, then call the `swagger` api and you are done!

```js
const fastify = require('fastify')()

fastify.register(require('fastify-swagger'), {
  routePrefix: '/documentation',
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
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
  transformStaticCSP: (header) => header
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
### register options
<a name="modes"></a>
#### modes
`fastify-swagger` supports two registration modes `dynamic` and `static`:
<a name="mode.dynamic"></a>
##### dynamic
`dynamic` mode is the default one, if you use the plugin this way - swagger specification would be gathered from your routes definitions.
  ```js
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

  *All the above parameters are optional.*
  You can use all the properties of the [swagger specification](https://swagger.io/specification/v2/) and [openapi specification](https://swagger.io/specification/), if you find anything missing, please open an issue or a pr!

  fastify-swagger will generate Swagger v2 by default. If you pass the `openapi` option it will generate OpenAPI instead.

  Example of the `fastify-swagger` usage in the `dynamic` mode, `swagger` option is available [here](examples/dynamic-swagger.js) and `openapi` option is available [here](examples/dynamic-openapi.js).

##### options

 | option             | default   | description                                                                                                               |
 | ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------- |
 | exposeRoute        | false     | Exposes documentation route.                                                                                              |
 | hiddenTag          | X-HIDDEN  | Tag to control hiding of routes.                                                                                          |
 | hideUntagged       | false     | If true remove routes without tags in schema from resulting swagger file                                                  |
 | stripBasePath      | true      | Strips base path from routes in docs.                                                                                     |
 | swagger            | {}        | Swagger configuration.                                                                                                    |
 | openapi            | {}        | OpenAPI configuration.                                                                                                    |
 | transform          | null      | Transform method for schema.                                                                                              |
 | uiConfig*          | {}        | Configuration options for [Swagger UI](https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md) |
 | initOAuth          | {}        | Configuration options for [Swagger UI initOAuth](https://swagger.io/docs/open-source-tools/swagger-ui/usage/oauth2/)      |
 | staticCSP          | false     | Enable CSP header for static resources.                                                                                   |
 | transformStaticCSP | undefined | Synchronous function to transform CSP header for static resources if the header has been previously set.                  | 

> `uiConfig` accepts only literal (number/string/object) configuration values since they are serialized in order to pass them to the generated UI. For more details see: [#5710](https://github.com/swagger-api/swagger-ui/issues/5710).

<a name="response.description"></a>
##### response description and response body description
If you do not supply a `description` for your response, a default description will be provided for you, because this is a required field per the Swagger schema.

So this:

```js
fastify.get('/defaultDescription', {
    schema: {
      response: {
        200: {
          type: 'string'
        }
      }
    }
  }, () => {})
```

Generates this in the Swagger (OAS2) schema's `paths`:

```json
{
  "/defaultDescription": {
    "get": {
      "responses": {
        "200": {
          "description": "Default Response",
          "schema": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

And this in the OAS 3 schema's `paths`:

```
{
  "/defaultDescription": {
    "get": {
      "responses": {
        "200": {
          "description": "Default Response",
          "schema": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

If you do supply just a `description`, it will be used both for the response as a whole and for the response body schema.

So this:

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

Generates this in the Swagger (OAS2) schema's `paths`:

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

And this in the OAS 3 schema's `paths`:

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

If you want to provide a different description for the response as a whole, instead use the `x-response-description` field alongside `description`:

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

Which generates this in the Swagger (OAS2) schema's `paths`:

```json
{
  "/responseDescription": {
    "get": {
      "responses": {
        "200": {
          "description": "response description",
          "schema": {
            "description": "schema description",
            "type": "string"
          }
        }
      }
    }
  }
}
```

And this in the OAS 3 schema's `paths`:

```json
{
  "/responseDescription": {
    "get": {
      "responses": {
        "200": {
          "description": "response description",
          "content": {
            "application/json": {
              "schema": {
                "description": "schema description",
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

##### 2XX status code
`fastify` itself support the `2xx`, `3xx` status, however `swagger` itself do not support this feature. We will help you to transform the `2xx` status code into `200` and we will omit `2xx` status code when you already declared `200` status code.
Note: `openapi` will not be affected as it support the `2xx` syntax.

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

// it will becomes below
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

##### response headers
You can decorate your own response headers by follow the below example.
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
Note: You need to specify `type` property when you decorate the response headers, otherwise the schema will be modified by `fastify`.

##### status code 204
We support status code 204 and return empty body. Please specify `type: 'null'` for the response otherwise `fastify` itself will fail to compile the schema.
```js
{
  response: {
    204: {
      type: 'null',
      description: 'No Content'
    }
  }
}
```

<a name="mode.static"></a>
##### static
 `static` mode should be configured explicitly. In this mode `fastify-swagger` serves given specification, you should craft it yourself.
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
  Example of the `fastify-swagger` usage in the `static` mode is available [here](examples/static-file.js).

  `specification.postProcessor` parameter is optional. It allows you to change your swagger object on the fly (for example - based on the environment). It accepts `swaggerObject` - a JavaScript object which was parsed from your `yaml` or `json` file and should return a swagger object.

  `specification.baseDir` allows specifying the directory where all spec files that are included in the main one using `$ref` will be located.
  By default, this is the directory where the main spec file is located. Provided value should be an absolute path **without** trailing slash.
<a name="additional"></a>
#### additional

If you pass `{ exposeRoute: true }` during the registration the plugin will expose the documentation with the following apis:

| url                     | description                                |
| ----------------------- | ------------------------------------------ |
| `'/documentation/json'` | the JSON object representing the API       |
| `'/documentation/yaml'` | the YAML object representing the API       |
| `'/documentation/'`     | the swagger UI                             |
| `'/documentation/*'`    | external files which you may use in `$ref` |

##### Overwrite swagger url end-point

If you would like to overwrite the `/documentation` url you can use the `routePrefix` option.

```js
fastify.register(require('fastify-swagger'), {
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    ...
  },
  hiddenTag: 'X-HIDDEN',
  exposeRoute: true,
  routePrefix: '/documentations'
}
```

##### Convert routes schema

If you would like to use different schemas like, let's say [Joi](https://github.com/hapijs/joi), you can pass a synchronous `transform` method in the options to convert them back to standard JSON schemas expected by this plugin to generate the documentation (`dynamic` mode only).

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

<a name="swagger.options"></a>

### swagger options

Calling `fastify.swagger` will return to you a JSON object representing your api, if you pass `{ yaml: true }` to `fastify.swagger`, it will return you a yaml string.

### Open API (OA) Parameter Options

Note: OA's terminology differs from Fastify's. OA uses the term "parameter" to refer to those parts of a request that in [Fastify's validation documentation](https://www.fastify.io/docs/latest/Validation-and-Serialization/#validation) are called "querystring", "params", "headers".

OA provides some options beyond those provided by the JSON schema specification for specifying the shape of parameters. A prime example of this the option for specifying how to encode those parameters that should be handled as arrays of values. There is no single universally accepted method for encoding such parameters appearing as part of query strings. OA2 provides a `collectionFormat` option that allows specifying how an array parameter should be encoded. (We're giving an example in the OA2 specification, as this is the default specification version used by this plugin. The same principles apply to OA3.) Specifying this option is easy. You just need to add it to the other options for the field you are defining. Like in this example:

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
          // Note that this is an Open API version 2 configuration option.  The
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

**IMPORTANT CAVEAT** These encoding options you can set in your schema have no bearing on how, for instance, a query string parser parses the query string. They change how Swagger UI presents its documentation, and how it generates `curl` commands when you click the `Try it out` button. Depending on which options you set in your schema, you *may also need* to change the default query string parser used by Fastify so that it produces a JavaScript object that will conform to the schema. As far as arrays are concerned, the default query string parser conforms to the `collectionFormat: "multi"` specification. If you were to select `collectionFormat: "csv"`, you would have to replace the default query string parser with one that parses CSV parameter values into arrays. The same caveat applies to the other parts of a request that OA calls "parameters" (e.g. headers, path parameters) and which are not encoded as JSON in a request.

#### Complex serialization in query and cookie, eg. JSON

Note: not supported for OA2 and lower version of specification. Read more in OA3 [documentation](https://swagger.io/docs/specification/describing-parameters/#schema-vs-content).

```
http://localhost/?filter={"foo":"baz","bar":"qux"}
```

**IMPORTANT CAVEAT** You also need to change the default query string parser used by Fastify so that it produces a JavaScript object that will conform to the schema. See [example](examples/json-in-querystring.js).

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

And this in the OAS 3 schema's `paths`:

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


<a name="hide"></a>
### Hide a route
Sometimes you may need to hide a certain route from the documentation, there is 2 alternatives:
- Pass `{ hide: true }` to the schema object inside the route declaration.
- Use the tag declared in `hiddenTag` options property inside the route declaration. Default is `X-HIDDEN`.

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

<a name="security"></a>
### Security
Global security definitions and route level security provide documentation only. It does not implement authentication nor route security for you. Once your authentication is implemented, along with your defined security, users will be able to successfully authenticate and interact with your API using the user interfaces of the documentation.

<a name="development"></a>
### Development
In order to start development run:
```
npm i
npm run prepare
```

So that [swagger-ui](https://github.com/swagger-api/swagger-ui) static folder will be generated for you.

#### How work under the hood

`fastify-static` serve the `swagger-ui` static files, then it calls `/docs/json` to get the swagger file and render it.

<a name="seealso"></a>
## See also
Sometimes you already have a Swagger definition and you need to build Fastify routes from that.
In that case checkout [fastify-swaggergen](https://github.com/seriousme/fastify-swaggergen) which helps you in doing just that.

<a name="acknowledgements"></a>
## Acknowledgements

This project is kindly sponsored by:
- [nearForm](https://nearform.com)
- [LetzDoIt](https://www.letzdoitapp.com/)

<a name="license"></a>
## License

Licensed under [MIT](./LICENSE).
