# fastify-swagger
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/fastify/fastify-swagger.svg?branch=master)](https://travis-ci.org/fastify/fastify-swagger)

Swagger documentation generator for Fastify.  
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
    produces: ['application/json']
  }
})

fastify.post('/some-route', {
  schema: {
    description: 'post some data',
    tags: ['user', 'code'],
    summary: 'qwerty',
    payload: {
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
    out: {
      description: 'Succesful response',
      code: 201,
      type: 'object',
      properties: {
        hello: { type: 'string' }
      }
    }
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
    schemes: [String],
    consumes: [String],
    produces: [String]
  }
}
```
*All the above parameters are optional.*

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

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
