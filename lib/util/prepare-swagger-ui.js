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
  .replace(/<script>(.*)<\/script>/gs, `
  <script>
  window.onload = function () {
    function resolveUrl (url) {
        const anchor = document.createElement('a')
        anchor.href = url
        return anchor.href
    }

    function resolveConfig (cb) {
      return fetch(
        resolveUrl('./uiConfig').replace('static/uiConfig', 'uiConfig')
      )
        .then(res => res.json())
        .then((config) => {
          const resConfig = Object.assign({}, {
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
          }, config, {
            url: resolveUrl('./json').replace('static/json', 'json'),
            oauth2RedirectUrl: resolveUrl('./oauth2-redirect.html')
          });
          return cb(resConfig);
        })
     }

    // Begin Swagger UI call region
    const buildUi = function (config) {
      const ui = SwaggerUIBundle(config)
      window.ui = ui

      fetch(resolveUrl('./initOAuth').replace('static/initOAuth', 'initOAuth'))
        .then(res => res.json())
        .then((config) => {
          ui.initOAuth(config);
      });
      
    }
    // End Swagger UI call region

    resolveConfig(buildUi);
  }
  </script>
  `)

fse.writeFileSync(resolve('./static/index.html'), newIndex)

const sha = {
  script: [],
  style: []
}
function computeCSPHashes (path) {
  const scriptRegex = /<script>(.*)<\/script>/gs
  const styleRegex = /<style>(.*)<\/style>/gs
  const indexSrc = fs.readFileSync(resolve(path)).toString('utf8')
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
}
computeCSPHashes('./static/index.html')
computeCSPHashes('./static/oauth2-redirect.html')
fse.writeFileSync(resolve('./static/csp.json'), JSON.stringify(sha))
