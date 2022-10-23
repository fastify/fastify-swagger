'use strict'

const { test } = require('tap')
const { formatParamUrl, localSchemaRefToAbs, patchDefinitionsKeywordInSchema } = require('../lib/util/common')

const cases = [
  ['/example/:userId', '/example/{userId}'],
  ['/example/:userId/:secretToken', '/example/{userId}/{secretToken}'],
  ['/example/near/:lat-:lng/radius/:r', '/example/near/{lat}-{lng}/radius/{r}'],
  ['/example/near/:lat_1-:lng_1/radius/:r_1', '/example/near/{lat_1}-{lng_1}/radius/{r_1}'],
  ['/example/*', '/example/{wildcard}'],
  ['/example/:file(^\\d+).png', '/example/{file}.png'],
  ['/example/at/:hour(^\\d{2})h:minute(^\\d{2})m', '/example/at/{hour}h{minute}m'],
  ['/example/at/(^\\d{2})h(^\\d{2})m', '/example/at/{regexp1}h{regexp2}m'],
  ['/example/at/(^([0-9]{2})h$)-(^([0-9]{2})m$)', '/example/at/{regexp1}-{regexp2}'],
  ['/name::verb', '/name:verb'],
  ['/api/v1/postalcode-jp/:code(^[0-9]{7}$)', '/api/v1/postalcode-jp/{code}'],
  ['/api/v1/postalcode-jp/(^[0-9]{7}$)', '/api/v1/postalcode-jp/{regexp1}']
]

test('formatParamUrl', async (t) => {
  t.plan(cases.length)

  for (const kase of cases) {
    t.equal(formatParamUrl(kase[0]), kase[1])
  }
})

test('local schema references to absolute schema references', async (t) => {
  const input = {
    $id: 'root',
    properties: {
      ObjectA: {
        $id: 'ObjectA',
        type: 'object',
        properties: {
          cat: {
            $ref: 'Cat#'
          },
          foo: {
            type: 'string'
          },
          bar: {
            $ref: '#/properties/foo'
          },
          barbar: {
            $id: 'Barbar',
            type: 'object',
            properties: {
              a: {
                type: 'string'
              },
              b: {
                $ref: '#/properties/a'
              }
            }
          },
          foofoo: {
            $ref: '#'
          }
        }
      }
    }
  }

  const expected = {
    $id: 'root',
    properties: {
      ObjectA: {
        $id: 'ObjectA',
        type: 'object',
        properties: {
          cat: {
            $ref: 'Cat#'
          },
          foo: {
            type: 'string'
          },
          bar: {
            $ref: 'root#/properties/ObjectA/properties/foo'
          },
          barbar: {
            $id: 'Barbar',
            type: 'object',
            properties: {
              a: {
                type: 'string'
              },
              b: {
                $ref: 'root#/properties/ObjectA/properties/barbar/properties/a'
              }
            }
          },
          foofoo: {
            $ref: 'root#/properties/ObjectA'
          }
        }
      }
    }
  }

  const res = localSchemaRefToAbs(input)
  t.match(expected, res)
})

test('definitions to properties keyword in schema', async (t) => {
  const input = {
    $id: 'root',
    definitions: {
      ObjectA: {
        type: 'object',
        properties: {
          cat: {
            $ref: 'root#/definitions/ObjectB'
          },
          box: {
            type: 'object',
            properties: {
              foo: {
                $ref: 'root#/definitions/ObjectA/definitions/ObjectC'
              }
            }
          }
        },
        definitions: {
          ObjectC: {
            type: 'object',
            properties: {
              foo: {
                type: 'string'
              }
            }
          }
        }
      },
      ObjectB: {
        type: 'object',
        properties: {
          sample: {
            type: 'string'
          }
        }
      }
    }
  }

  const expected = {
    $id: 'root',
    properties: {
      ObjectA: {
        type: 'object',
        properties: {
          cat: {
            $ref: 'root#/properties/ObjectB'
          },
          box: {
            type: 'object',
            properties: {
              foo: {
                $ref: 'root#/properties/ObjectA/properties/ObjectC'
              }
            }
          },
          ObjectC: {
            type: 'object',
            properties: {
              foo: {
                type: 'string'
              }
            }
          }
        }
      },
      ObjectB: {
        type: 'object',
        properties: {
          sample: {
            type: 'string'
          }
        }
      }
    }
  }

  const res = patchDefinitionsKeywordInSchema(input)
  t.match(expected, res)
})

test('properties precedence on definitions->properties merge)', async (t) => {
  const input = {
    $id: 'root',
    definitions: {
      ObjectA: {
        type: 'object',
        properties: {
          foo: {
            type: 'string'
          },
          bar: {
            type: 'string'
          }
        }
      }
    },
    properties: {
      ObjectA: {
        type: 'object',
        properties: {
          foobar: {
            type: 'string'
          }
        }
      }
    }
  }

  const expected = {
    $id: 'root',
    properties: {
      ObjectA: {
        type: 'object',
        properties: {
          foobar: {
            type: 'string'
          }
        }
      }
    }
  }

  const res = patchDefinitionsKeywordInSchema(input)
  t.match(expected, res)
})
