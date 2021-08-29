const Ajv = require('ajv');

const validatorCompiler = () => {
    const ajv = new Ajv({
        removeAdditional: true, // remove additional properties
        useDefaults: true, // replace missing properties and items with the values from corresponding default keyword
        coerceTypes: true, // change data type of data to match type keyword
        nullable: true // support keyword "nullable" from Open API 3 specification.
    })

    ajv.addFormat('binary', {
        type: 'string',
        validate: () => true
    })
    ajv.addFormat('byte', {
        type: 'string',
        validate: () => true
    })
    ajv.addFormat('int32', {
        type: 'number',
        validate: () => true
    })
    ajv.addFormat('int64', {
        type: 'number',
        validate: () => true
    })

    return function (schema) {
        return ajv.compile(schema)
    }

}

module.exports = validatorCompiler;