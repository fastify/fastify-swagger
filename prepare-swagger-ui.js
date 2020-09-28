const fs = require('fs')
const fse = require('fs-extra')
const crypto = require('crypto')
const swaggerUiAssetPath = require('swagger-ui-dist').getAbsoluteFSPath()
const resolve = require('path').resolve

fse.emptyDirSync(resolve('./static'))

// since the original swagger-ui-dist folder contains non UI files
const filesToCopy = ['favicon-16x16.png',
  'favicon-32x32.png',
  'index.html',
  'oauth2-redirect.html',
  'swagger-ui-bundle.js',
  'swagger-ui-bundle.js.map',
  'swagger-ui-standalone-preset.js',
  'swagger-ui-standalone-preset.js.map',
  'swagger-ui.css',
  'swagger-ui.css.map',
  'swagger-ui.js',
  'swagger-ui.js.map']
filesToCopy.forEach(filename => {
  fse.copySync(`${swaggerUiAssetPath}/${filename}`, resolve(`./static/${filename}`))
})

const newIndex = fs.readFileSync(resolve('./static/index.html'), 'utf8')
  .replace('window.ui = ui', `window.ui = ui

  function resolveUrl (url) {
      const anchor = document.createElement('a')
      anchor.href = url
      return anchor.href
  }`)
  .replace(
    /url: "(.*)",/,
    `url: resolveUrl('./json').replace('static/json', 'json'),
    oauth2RedirectUrl: resolveUrl('./oauth2-redirect.html'),`
  )

fse.writeFileSync(resolve('./static/index.html'), newIndex)

const sha = {
  script: [],
  style: []
}
const scriptRegex = /<script>(.*)<\/script>/gs
const styleRegex = /<style>(.*)<\/style>/gs
const indexSrc = fs.readFileSync(resolve('./static/index.html')).toString('utf8')
let result = scriptRegex.exec(indexSrc)
while (result !== null) {
  const hash = crypto.createHash('sha256')
  hash.update(result[1])
  sha.script.push(`'sha256-${hash.digest().toString('base64')}'`)
  result = scriptRegex.exec(indexSrc)
}
result = styleRegex.exec(indexSrc)
while (result !== null) {
  const hash = crypto.createHash('sha256')
  hash.update(result[1])
  sha.style.push(`'sha256-${hash.digest().toString('base64')}'`)
  result = styleRegex.exec(indexSrc)
}
fse.writeFileSync(resolve('./static/csp.json'), JSON.stringify(sha))
