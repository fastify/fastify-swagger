'use strict'

const paramPattern = /\{[^{}]+\}/g

function hasParams (url) {
  if (!url) return false
  const matches = url.match(paramPattern)
  return matches !== null && matches.length > 0
}

function matchParams (url) {
  if (!url) return []
  return url.match(paramPattern) || []
}

module.exports = {
  hasParams,
  matchParams
}
