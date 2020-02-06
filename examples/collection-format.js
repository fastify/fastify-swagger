'use strict'

const fastify = require('fastify')()

fastify.register(require('../index'), {
  exposeRoute: true
})

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
          // options changed in version 3. The plugin currently only supports
          // version 2 of Open API.
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

fastify.listen(0, (err, addr) => {
  if (err) throw err
  console.log(`listening on ${addr}`)
})
