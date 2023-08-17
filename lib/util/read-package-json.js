'use strict'

const fs = require('fs')
const path = require('path')

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
