/*
Copyright (C) 2013 Tony Mobily

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
  [ ] Write tests
*/

const CircularJSON = require('circular-json')

const SimpleSchema = class {
  constructor (structure, options) {
    this.structure = structure
    this.options = options || {}
  }

  // Built-in types
  // definition, value, fieldName, options, failedCasts
  noneType (p) {
    return p.value
  }

  stringType (p) {
    if (typeof p.value === 'undefined' || p.value === null) return ''

    // No toString() available: failing to cast
    if (typeof (p.value.toString) === 'undefined') {
      throw this._typeError(p.fieldName)
    }

    // Return cast value, trimmed by default (unless noTrim is passed to the definition)
    const r = p.value.toString()
    return p.definition.noTrim ? r : r.trim()
  }

  blobType (p) {
    return p.value
  }

  numberType (p) {
    if (typeof (p.value) === 'undefined') return 0

    // If Number() returns NaN, fail
    const r = Number(p.value)
    if (isNaN(r)) {
      throw this._typeError(p.fieldName)
    }

    // Return cast value
    return r
  }

  // This is like "number", but it will set timestamp as NULL for empty strings
  timestampType (p) {
    // If Number() returns NaN, fail
    const r = Number(p.value)
    if (isNaN(r)) {
      throw this._typeError(p.fieldName)
    }

    // Return cast value
    return r
  }

  dateType (p) {
    // Undefined: return a new date object
    if (typeof (p.value) === 'undefined') {
      return new Date()
    }

    // If new Date() returns NaN, date was not corect, fail
    const r = new Date(p.value)
    if (isNaN(r)) {
      throw this._typeError(p.fieldName)
    }

    // return cast value
    return r
  }

  arrayType (p) {
    return Array.isArray(p.value) ? p.value : [p.value]
  }

  serializeType (p) {
    let r

    if (p.options.deserialize) {
      if (typeof (p.value) !== 'string') {
        throw this._typeError(p.fieldName)
      }

      try {
        // Attempt to stringify
        r = CircularJSON.parse(p.value)

        // It worked: return r
        return r
      } catch (e) {
        throw this._typeError(p.fieldName)
      }
    } else {
      try {
        r = CircularJSON.stringify(p.value)

        // It worked: return r
        return r
      } catch (e) {
        throw this._typeError(p.fieldName)
      }
    //
    }
  }

  booleanType (p) {
    if (typeof (p.value) === 'string') {
      if (p.value === (p.definition.stringFalseWhen || 'false')) return false
      else if ((p.value === (p.definition.stringTrueWhen || 'true')) || (p.value === (p.definition.stringTrueWhen || 'on'))) return true
      else return false
    } else {
      return !!p.value
    }
  }

  // Cast an ID for this particular engine. If the object is in invalid format, it won't
  // get cast, and as a result check will fail
  idType (p) {
    const n = parseInt(p.value)
    if (isNaN(n)) {
      throw this._typeError(p.fieldName)
    } else {
      return n
    }
  }

  // Built-in parameters

  minParam (p) {
    if (typeof p.value === 'undefined') return
    if (p.definition.type === 'number' && typeof p.value === 'number' && Number(p.value) < p.parameterValue) {
      throw this._paramError(p.fieldName, "Field's value is too low")
    }
    if (p.definition.type === 'string' && p.value.toString && p.value.toString().length < p.parameterValue) {
      throw this._paramError(p.fieldName, 'Field is too short')
    }
  }

  maxParam (p) {
    if (typeof p.value === 'undefined') return
    if (p.definition.type === 'number' && typeof p.value === 'number' && Number(p.value) > p.parameterValue) {
      throw this._paramError(p.fieldName, "Field's value is too high")
    }

    if (p.definition.type === 'string' && p.value.toString && p.value.toString().length > p.parameterValue) {
      throw this._paramError(p.fieldName, 'Field is too long')
    }
  }

  validatorParam (p) {
    if (typeof (p.parameterValue) !== 'function') {
      throw (new Error('Validator function needs to be a function, found: ' + typeof (p.parameterValue)))
    }

    const r = p.parameterValue(p.object[p.fieldName], p.object, { schema: this, fieldName: p.fieldName})
    if (typeof (r) === 'string') throw this._paramError(p.fieldName, r)
  }

  uppercaseParam (p) {
    if (p.definition.type !== 'string' || typeof p.value !== 'string') return
    return p.value.toUpperCase()
  }

  lowercaseParam (p) {
    if (p.definition.type !== 'string' || typeof p.value !== 'string') return
    return p.value.toLowerCase()
  }

  trimParam (p) {
    // For strings, trim works as intended: it will trim the cast string
    if (p.definition.type === 'string' && typeof p.value === 'string') {
      return p.value.substr(0, p.parameterValue)

    // For non-string values, it will however check the original value. If it's longer than it should, it will puke
    } else {
      if (Number.isInteger(Number(p.valueBeforeCast)) && String(Number(p.valueBeforeCast)).length > p.parameterValue) throw this._paramError(p.fieldName, 'Value out of range')
    }
  }

  defaultParam (p) {
    let v
    if (typeof (p.valueBeforeCast) === 'undefined') {
      if (typeof (p.parameterValue) === 'function') {
        v = p.parameterValue(p)
      } else {
        v = p.parameterValue
      }
      p.object[p.fieldName] = v
    }
  }

  notEmptyParam (p) {
    const bc = p.valueBeforeCast
    const bcs = (typeof bc !== 'undefined' && bc !== null && bc.toString ? bc.toString() : '')
    if (p.parameterValue && !Array.isArray(p.value) && typeof (bc) !== 'undefined' && bcs === '') {
      throw this._paramError(p.fieldName, 'Field cannot be empty')
    }
  }

  _typeError (field) {
    const e = new Error('Error with field: ' + field)
    e.errorObject = { field, message: 'Error during casting' }
    return e
  }

  _paramError (field, message) {
    const e = new Error(message)
    e.errorObject = { field, message }
    return e
  }

  // Options:
  //
  //  * options.onlyObjectValues             -- Will apply cast for existing object's keys rather than the schema itself
  //  * options.skipFields                   -- To know what casts need to be skipped
  //  * options.skipParams                   -- Won't apply specific params for specific fields
  //  * options.emptyAsNull                  -- Empty string values will be cast to null (also as a per-field option)
  //  * options.canBeNull                    -- All values can be null (also as a per-field option)
  //
  //  * Common parameters for every type
  //    * required -- the field is required
  //    * canBeNull -- the "null" value is always accepted
  //    * emptyAsNull -- an empty string will be stored as null
  //
  // This will run _cast and _param
  async validate (object, options) {
    const errors = []
    let skipBoth
    let skipCast
    let targetObject
    let fieldName
    let result

    function emptyString (s) {
      return String(s) === ''
    }

    // Copy object over
    const validatedObject = Object.assign({}, object)

    options = options || {}

    // Check for spurious fields not in the schema
    for (fieldName in object) {
      if (typeof this.structure[fieldName] === 'undefined') {
        errors.push({ field: fieldName, message: 'Field not allowed' })
      }
    }

    // Set the targetObject. If the target is the object itself,
    // then missing fields won't be a problem
    if (options.onlyObjectValues) targetObject = object
    else targetObject = this.structure

    for (fieldName in targetObject) {
      const definition = this.structure[fieldName]

      if (!definition) continue

      // The checking logic will check if cast -- or both cast and params --
      // should be skipped
      skipCast = false
      skipBoth = false

      let canBeNull
      if (definition.default === null) canBeNull = true
      else if (typeof definition.canBeNull !== 'undefined') canBeNull = definition.canBeNull
      else if (typeof options.canBeNull !== 'undefined') canBeNull = !!options.canBeNull
      else canBeNull = false

      let emptyAsNull
      if (typeof definition.emptyAsNull !== 'undefined') emptyAsNull = definition.emptyAsNull
      else if (typeof options.emptyAsNull !== 'undefined') emptyAsNull= !!options.emptyAsNull
      else emptyAsNull = false

      // Skip cast/param if so required by the skipFields array
      if (Array.isArray(options.skipFields) && options.skipFields.indexOf(fieldName) !== -1) {
        skipBoth = true
      }

      // Skip castParam if value is `undefined` AND it IS required (enriching error)
      // NOTE: this won't happen if 'required' is in the list of parameters to be skipped

      if (definition.required && typeof (object[fieldName]) === 'undefined') {
        if (!this._paramToBeSkipped('required', options.skipParams, fieldName)) {
          skipBoth = true
          errors.push({ field: fieldName, message: 'Field required' })
        }
      }

      // Skip casting if value is `undefined` AND it's not required
      if (!definition.required && typeof (object[fieldName]) === 'undefined') {
        skipCast = true
      }

      // If it's null, then really check: either canBeNull is true, or return with a message
      if (object[fieldName] === null) {
        skipBoth = true
        if (!canBeNull) {
          errors.push({ field: fieldName, message: 'Field cannot be null' })
        }
      }

      // Empty string: check if it should be forced to null
      if (emptyString(object[fieldName])) {
        if (emptyAsNull) {
          validatedObject[fieldName] = null
          skipBoth = true
        }
      }

      // If cast is skipped for whatever reason, params will never go through either
      if (skipBoth) continue

      if (!skipCast) {
        // Run the xxxType function for a specific type
        if (typeof (this[definition.type + 'Type']) === 'function') {
          try {
            result = await this[definition.type + 'Type']({
              definition,
              value: object[fieldName],
              fieldName,
              object: validatedObject,
              objectBeforeCast: object,
              options
            })
          } catch (e) {
            if (!e.errorObject) throw e
            errors.push(e.errorObject)
          }
          if (typeof result !== 'undefined') validatedObject[fieldName] = result
        } else {
          throw (new Error('No casting function found, type probably wrong: ' + definition.type))
        }
      }

      for (const parameterName in this.structure[fieldName]) {
        //
        // If it's to be skipped, we shall skip -- e.g. `options.skipParams == { tabId: ['required'] }` to
        // skip `required` parameter for `tabId` field
        if (this._paramToBeSkipped(parameterName, options.skipParams, fieldName)) continue

        if (parameterName !== 'type' && typeof (this[parameterName + 'Param']) === 'function') {
          try {
            result = await this[parameterName + 'Param']({
              definition,
              value: validatedObject[fieldName],
              fieldName,
              object: validatedObject,
              objectBeforeCast: object,
              valueBeforeCast: object[fieldName],
              parameterName,
              parameterValue: definition[parameterName],
              options: options
            })
          } catch (e) {
            if (!e.errorObject) throw e
            errors.push(e.errorObject)
          }

          if (typeof (result) !== 'undefined') validatedObject[fieldName] = result
        }
      }
    }
    return { validatedObject, errors }
  }

  _paramToBeSkipped (parameterName, skipParams, fieldName) {
    if (typeof (skipParams) !== 'object' || skipParams === null) return false
    if (Array.isArray(skipParams[fieldName]) && skipParams.indexOf(parameterName) !== -1) return true
    return false
  }

  cleanup (object, parameterName) {
    const newObject = {}
    for (const k in object) {
      if (!this.structure[k]) continue
      if (this.structure[k][parameterName]) {
        delete object[k]
        newObject[k] = object[k]
      }
    }
    return newObject
  }
}

exports = module.exports = SimpleSchema

/*
let  s = new SimpleSchema({
  level: { type: 'number', default: 10 },
  name: { type: 'string', trim: 50 },
  surname: { type: 'string', required: true, trim: 10 },
  age: { type: 'number', min: 10, max: 20 }
})

let { validatedObject, errors } = s.validate({ name: 'Tony', surname: 'Mobily1234567890' }, { __onlyObjectValues: true })

console.log('RESULT:', validatedObject, errors)
*/
