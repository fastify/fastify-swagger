'use strict'

function resolveSwaggerFunction (opts, cache, routes, Ref, done) {
  if (opts.openapi === undefined || opts.openapi === null) {
    return require('../spec/swagger')(opts, cache, routes, Ref, done)
  } else {
    return require('../spec/openapi')(opts, cache, routes, Ref, done)
  }
}

module.exports = {
  resolveSwaggerFunction
}
