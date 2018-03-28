'use strict'

const fastify = require('fastify')()

fastify.register(require('../index'), {
  mode: 'static',
  specification: {
    path: './examples/example-static-specification.yaml'
  },
  exposeRoute: true
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log('listening')
})
