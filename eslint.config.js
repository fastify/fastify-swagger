'use strict'

module.exports = require('neostandard')({
  ignores: [
    ...require('neostandard').resolveIgnoresFromGitignore(),
    'static',
    'tap-snapshots/*'
  ],
  ts: true
})
