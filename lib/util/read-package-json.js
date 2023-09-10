'use strict'

const fs = require('node:fs')
const path = require('node:path')

function readPackageJson () {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json')))
  } catch (err) {
    return {}
  }
}

module.exports = {
  readPackageJson
}
