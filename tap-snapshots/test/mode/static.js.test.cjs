/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/mode/static.js TAP postProcessor works, swagger route returns updated yaml > must match snapshot 1`] = `
openapi: 3.0.0
info:
  description: Test swagger specification
  version: 1.0.0
  title: Test swagger specification
  contact:
    email: super.developer@gmail.com
servers:
  - url: http://localhost:4000/
    description: Localhost (uses test data)
paths:
  /status:
    get:
      description: Status route, so we can check if server is alive
      tags:
        - Status
      responses:
        "200":
          description: Server is alive
          content:
            application/json:
              schema:
                type: object
                properties:
                  health:
                    type: boolean
                  date:
                    type: string
                example:
                  health: true
                  date: 2018-02-19T15:36:46.758Z

`

exports[`test/mode/static.js TAP specification validation check works > must match snapshot 1`] = `
Error: specification is missing in the module options
`

exports[`test/mode/static.js TAP specification validation check works > must match snapshot 2`] = `
Error: specification is not an object
`

exports[`test/mode/static.js TAP specification validation check works > must match snapshot 3`] = `
Error: both specification.path and specification.document are missing, should be path to the file or swagger document spec
`

exports[`test/mode/static.js TAP specification validation check works > must match snapshot 4`] = `
Error: specification.path is not a string
`

exports[`test/mode/static.js TAP specification validation check works > must match snapshot 5`] = `
Error: /hello/lionel.richie does not exist
`

exports[`test/mode/static.js TAP specification validation check works > must match snapshot 6`] = `
Error: specification.postProcessor should be a function
`

exports[`test/mode/static.js TAP swagger route returns explicitly passed doc > must match snapshot 1`] = `
{
  "info": {
    "title": "Test swagger",
    "description": "testing the fastify swagger api",
    "version": "0.1.0"
  }
}
`
