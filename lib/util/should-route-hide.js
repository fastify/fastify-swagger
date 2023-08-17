'use strict'

function shouldRouteHide (schema, opts) {
  const { hiddenTag, hideUntagged } = opts

  if (schema && schema.hide) {
    return true
  }

  const tags = (schema && schema.tags) || []

  if (tags.length === 0 && hideUntagged) {
    return true
  }

  if (tags.includes(hiddenTag)) {
    return schema.tags.includes(hiddenTag)
  }

  return false
}

module.exports = {
  shouldRouteHide
}
