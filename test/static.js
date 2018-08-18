'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifySwagger = require('../index')
const yaml = require('js-yaml')

test('specification validation check works', t => {
  const specifications = [
    '',
    '123',
    {},
    {
      path: 123
    },
    {
      path: '/hello/lionel.richie'
    },
    {
      path: './examples/example-static-specification.yaml',
      postProcessor: 'hello'
    }
  ]

  t.plan(specifications.length * 2)

  specifications.forEach(specification => {
    const fastify = Fastify()
    fastify.register(fastifySwagger, {
      mode: 'static',
      specification,
      exposeRoute: true
    })

    fastify.ready(err => {
      t.notEqual(err, undefined)
      t.matchSnapshot(err.toString())
    })
  })
})

test('swagger route returns yaml', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  })

  // check that yaml is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/yaml'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/x-yaml')
      try {
        yaml.safeLoad(res.payload)
        t.pass('valid swagger yaml')
      } catch (err) {
        t.fail(err)
      }
    }
  )
})
test('swagger route returns json', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      type: 'file',
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  })

  // check that json is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)

      // console.log(res.payload)
      try {
        var payload = JSON.parse(res.payload)
        t.matchSnapshot(JSON.stringify(payload, null, 2))
      } catch (error) {
        t.fail(error)
      }
    }
  )
})

test('postProcessor works, swagger route returns updated yaml', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml',
      postProcessor: function (swaggerObject) {
        swaggerObject.servers[0].url = 'http://localhost:4000/'
        return swaggerObject
      }
    },
    exposeRoute: true
  })

  // check that yaml is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/yaml'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/x-yaml')
      try {
        yaml.safeLoad(res.payload)
        t.matchSnapshot(res.payload)
        t.pass('valid swagger yaml')
      } catch (err) {
        t.fail(err)
      }
    }
  )
})
test('swagger route returns explicitly passed doc', t => {
  t.plan(3)
  const fastify = Fastify()

  const document = {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    }
  }
  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      document
    },
    exposeRoute: true
  })

  // check that json is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)

      try {
        var payload = JSON.parse(res.payload)
        t.matchSnapshot(JSON.stringify(payload, null, 2))
        t.pass('valid explicitly passed spec document')
      } catch (error) {
        t.fail(error)
      }
    }
  )
})
