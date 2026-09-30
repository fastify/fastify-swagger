'use strict'

const Ref = require('json-schema-resolver')
const cloner = require('rfdc')({ proto: true, circles: false })
const { prepareSharedSchemas, referenceInlineDefinitions, rewriteAnchorRefs } = require('./definitions')

function addHook (fastify, pluginOptions) {
  const routes = []
  const instances = []
  const sharedSchemasMap = new Map()
  let hookRun = false

  fastify.addHook('onRoute', (routeOptions) => {
    const routeConfig = routeOptions.config || {}
    const swaggerConfig = routeConfig.swagger || {}
    if (routeOptions.method === 'HEAD' && pluginOptions.exposeHeadRoutes !== true && swaggerConfig.exposeHeadRoute !== true) {
      return
    }

    if (
      routeOptions.method === 'HEAD' &&
            routeOptions.schema !== undefined &&
            routeOptions.schema.operationId !== undefined
    ) {
      routes.push(
        // If two routes with operationId are added to the swagger
        // object, it is no longer valid.
        // therefore we suffix the operationId with `-head`.
        Object.assign({}, routeOptions, {
          schema: Object.assign({}, routeOptions.schema, {
            operationId: `${routeOptions.schema.operationId}-head`
          })
        })
      )
      return
    }

    routes.push(routeOptions)
  })

  fastify.addHook('onRegister', async (instance) => {
    instances.push(instance)
  })

  fastify.addHook('onReady', (done) => {
    hookRun = true
    for (const instance of instances) {
      // TODO: better handle for schemaId
      // when schemaId is the same in difference instance
      // the latter will lost
      const allSchemas = instance.getSchemas()
      for (const schemaId of Object.keys(allSchemas)) {
        sharedSchemasMap.set(schemaId, allSchemas[schemaId])
      }
    }
    const allSchemas = fastify.getSchemas()
    for (const schemaId of Object.keys(allSchemas)) {
      // it is the top-level, we do not expect to have duplicate id
      sharedSchemasMap.set(schemaId, allSchemas[schemaId])
    }
    // clear the instances array to avoid memory leak
    instances.length = 0
    done()
  })

  return {
    routes,
    Ref () {
      if (hookRun === false) {
        throw new Error('.swagger() must be called after .ready()')
      }
      const externalSchemas = cloner(Array.from(sharedSchemasMap.values()))
      const anchors = prepareSharedSchemas(externalSchemas)

      const ref = Ref(Object.assign(
        { applicationUri: 'todo.com' },
        pluginOptions.refResolver,
        { clone: true, externalSchemas })
      )

      // The ref resolver does not support the references to an anchor
      // (`http://foo/common.json#address`): they are converted to JSON pointers
      // before the resolution. The clone avoids touching the route schemas.
      const resolve = anchors.size === 0
        ? ref.resolve
        : (schema, opts) => ref.resolve(rewriteAnchorRefs(cloner(schema), anchors), opts)

      // The ref resolver collects the subschemas having an `$id` (eg. TypeBox
      // recursive types) and rewrites the references to them, but it does not
      // emit them: they are replaced by a reference and collected here, to be
      // added to the top-level definitions of the document.
      const sharedNames = new Set(Object.keys(ref.definitions().definitions))
      const inlineDefinitions = {}

      return {
        definitions: ref.definitions,
        resolve (schema, opts) {
          const resolved = resolve(schema, opts)
          // the schemas nested in a collected one are collected as well
          const queue = [resolved]
          while (queue.length > 0) {
            const found = referenceInlineDefinitions(queue.shift(), ref, sharedNames)
            for (const name of Object.keys(found)) {
              if (Object.hasOwn(inlineDefinitions, name)) continue
              inlineDefinitions[name] = found[name]
              queue.push(found[name])
            }
          }
          return resolved
        },
        // the definitions collected from the route schemas, by name
        inlineDefinitions
      }
    }
  }
}

module.exports = {
  addHook
}
