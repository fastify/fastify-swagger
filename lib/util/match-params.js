'use strict'

const paramPattern = /\{[^{}]+\}/g

function hasParams (url) {
  if (!url) return false
  return paramPattern.test(url)
}

function matchParams (url) {
  if (!url) return []
  return url.match(paramPattern) || []
}

module.exports = {
  hasParams,
  matchParams
}
