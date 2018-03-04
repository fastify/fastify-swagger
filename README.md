# fastify-swagger

[![Greenkeeper badge](https://badges.greenkeeper.io/fastify/fastify-swagger.svg)](https://greenkeeper.io/)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/fastify/fastify-swagger.svg?branch=master)](https://travis-ci.org/fastify/fastify-swagger)

[Swagger](https://swagger.io/) documentation generator for Fastify.  
It uses the schemas you declare in your routes to generate a swagger compliant doc.

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
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    }
  }
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
        "api_key": []
      }
    ]
  }
}, (req, reply) => {})

fastify.ready(err => {
  if (err) throw err
  fastify.swagger()
})
```

## API
#### register options
```js
{
  swagger: {
    info: {
      title: String,
      description: String,
      version: String
    },
    host: String,
    schemes: [ String ],
    consumes: [ String ],
    produces: [ String ],
    securityDefinitions: Object
  }
}
```
*All the above parameters are optional.*  
You can use all the properties of the [swagger specification](https://swagger.io/specification/), if you find anything missing, please open an issue or a pr!

<a name="options"></a>
#### swagger options
Calling `fastify.swagger` will return to you a JSON object representing your api, if you pass `{ yaml: true }` to `fastify.swagger`, it will return you a yaml string.

If you pass `{ exposeRoute: true }` the plugin will expose the documentation with the following apis:

|  url  |  description   |
|-------|----------------|
|`'/documentation/json'` | the json object representing the api  |
|`'/documentation/yaml'` | the yaml object representing the api  |
|`'/documentation'` | the swagger ui  |

<a name="hide"></a>
#### Hide a route
Sometimes you may need to hide a certain route from the documentation, just pass `{ hide: true }` to the schema object inside the route declaration.

#### Security
Global security definitions and route level security provide documentation only. It does not implement authentication nor route security for you. Once your authentication is implemented, along with your defined security, users will be able to successfully authenticate and interact with your API using the user interfaces of the documentation.

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
