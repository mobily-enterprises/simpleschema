SimpleSchema TWO
================


SimpleSchema is a _simple_ library to validate objects and cast their attributes according to their (schema) types.

Main features:

* It's _very_ easy to use and extend (adding both data types and parameters)
* It's tailored for `req.body`, built for casting simple (not nested) data strucures
* It down-to-earth ES2015 code
* Fully unit-tested _(note: no longer true after rewrite, but it will be soon)_

# Brief introduction

Here is SimpleSchema in a nutshell:
    var Schema = require( 'simpleschema' );

    personSchema = new Schema({
      name: { type: 'string', trim: 20 },
      age:  { type: 'number', default: 30, max: 140 },
      rank: { type: 'number', default: 99, max: 99 },
    });  

In a normal node/Express application, you would simply use the `validate()` method of personSchema against `req.body`:

    // Definition of a standard callback

    function formSubmit( req, res, next ){

      var { validatedObject, errors } = self.schema.validate(req.body)

      if( errors.length) {
        // Do what you normally do when there is an error,
        // ...

        // For example, make up a new error and go to the next route
        // The error object will include an `errors` attribute with the validation errors
        var e = new Error()
        e.errors = errors
        return next(e)
      }

      // Cleanup (that is, delete) `rank` which must not be stored on the DB
      var dbReady = personSchema.cleanup( validatedObject, 'doNotSave' )
    })

This ensures that all values are cast appropriately (everything in `req.body` comes as a string, whereas you will want `age` and `rank` as proper Javascript numbers).

Note that in this field:

      rank: { type: 'number', default: 99, max: 99, doNotSave: true },

* `type` is the field type. It means that when running personSchema.validate(), `rank` will be cast as a number
* `default`, `max` are the "field parameters".

## The schema description: all features

Here is a schema which covers _every_ single feature in terms of types and parameters (parameters will not be repeated):

    // If there is an error, the validator function will need to return a string describing it.
    // otherwise, return nothing.
    var fieldValidatorFunc =  function( obj, value, fieldName ){
      if( value == 130 ) return 'Age cannot be 130';
      return;
    };

    complexSchema = new Schema({
      id:      { type: 'id' },
      name:    { type: 'string', default: 'SOMETHING', uppercase: true, trim: 4, required: true, notEmpty: true },
      surname: { type: 'string', lowercase: true },
      age:     { type: 'number', default: 15, min: 0, max: 150, validator: fieldValidatorFunc },
      date:    { type: 'date', emptyAsNull: true},
      list:    { type: 'array', canBeNull: true },
      various: { type: 'serialize', required: false },
    })

Note:

 * Casting to the field's type (depending on `type`) always happens first; parameters (min, max, lowercase, etc.) are applied afterwards
 * If casting to its type fails, no parameters for that field will be applied (and `errors` will have the casting error on that field)
 * The order of parameters matters. Parameters are processed in the order they are encountered. If you have `{ default: 'something', uppercase: true }`, the result will be `SOMETHING`.
 * the `serialize` type will convert an object into a string. You need to use the option `{ deserialize: true }` when validating if you want to do the opposite.
 * `min`, `max` on `string`s will check the string length; on `number`s will check number value
 * `uppercase`, `lowercase`, `trim` will only apply to `string`s
 * `notEmpty` will fail if the  object's corresponding attribute was `v == ''` (note the weak `==`) and will never fail for arrays
 * `required` will fail if the  object's corresponding attribute (before casting) was `undefined` and will never fail for arrays;
 * `emptyAsNull` will make sure that values that cast to an empty string are converted to `null`.
 * `canBeNull` will allow values to be stored as null, bypassing casting and parameters.
 * `string` type checks parameter `noTrim` (it will not trim if there)
 * `boolean` type checks parameters `stringFalseWhen` and `stringTrueWhen` so that the strings `false` and `true` can be seen as false and true respectively
 * If `fieldValidatorFunc` returns a string, then an error will be added for that field. Note that this function is synchronous

Note: `required`, `emptyAsNull` and `canBeNull` are the only parameters implemeted directly into the `validate` function itself, which is SimpleSchema's core. Everything else is  


# Validating against a schema

Validation happens with the `schema.validate()` function:

    var { validatedObject, errors } = complexSchema.validate(object, {})

The `validate()` function takes the following parameters:

 * The object to validate
 * An optional `options` object with extra options

Here is an example of basic usage:

   let p = {
      name: 'TOnyName',
      surname: 'MOBILY',
      age: '37',
      id: 3424234424,
      date: '2013-10-10',
      list: [ 'one', 'two', 'three' ],
      various: { a: 10, b: 20 }
    }

    let { validatedObject, errors } = complexSchema.validate(p)

`validatedObject` will be:

    { name: 'TONY',
      surname: 'mobily',
      age: 37,
      id: 3424234424,
      date: Thu Oct 10 2013 08:00:00 GMT+0800 (WST),
      list: [ 'one', 'two', 'three' ] },
      various: '{"a":10,"b":20}'
    }

And `errors` will be empty. Note that `name` is uppercase and trimmed to 4, `surname` is lowercase, `age` is now a proper Javascript number, `date` is a proper date.

## The returned `errors` array

The `errors` variable is an array of objects; each element contains `field` (the field that had the error) and `message` (the error message for that field). For example:

    [
      { field: 'age', message: 'Age cannot be 130' },
      { field: 'name', message: 'Name not valid' }
    ]

The same field can potentially have more than one error message attached to it.

## The `options` object

The second parameter of `schema.validate()` is an (optional) options object. Possible values are:

### `onlyObjectValues`

This option allows you to apply `schema.validate()` only to the fields that are actually defined in the object, regardless of what was required and what wasn't. This allows you to run `schema.validate()` against partial objects. For example:

    p = {
      name: 'MERCMOBILY',
    }

    var { validatedObject, errors } = complexSchema.validate(p)

`validatedObject` will be:

    { name: 'MERC' }

Note that only what "was there" was processed (it was cast and had parameters assigned).

### `skipFields`

The option `skipFields` is used when you want to skip validation completely for specific fields.

    p = {
      name: 'TOny',
      surname: 'MOBILY',
      age: '37',
      id: 3424234424,
      date: '2013-10-10',
      list: [ 'one', 'two', 'three' ]
    }

    let { validatedObject, errors } = complexSchema.validate(p, { skipFields: [ 'age' ]})

`validatedObject` will be (note that '37' is still a string):

    { name: 'TONY',
      surname: 'mobily',
      age: '37',
      id: 3424234424,
      date: Thu Oct 10 2013 08:00:00 GMT+0800 (WST),
      list: [ 'one', 'two', 'three' ] },
    }

### `skipParams`

The option `skipParams` is used when you want to decide which parameters you want to skip for which fields.

    p = {
      name: 'Chiara',
      surname: 'MOBILY',
      age: '37',
      id: 3424234424,
      date: '2013-10-10',
      list: [ 'one', 'two', 'three' ]
    }

    let { validatedObject, errors } = complexSchema.validate(p, { skipParams: { name: [ 'uppercase', 'trim' ] } }

`validatedObject` will be:

    { name: 'Chiara',
      surname: 'mobily',
      age: 37,
      id: 3424234424,
      date: Thu Oct 10 2013 08:00:00 GMT+0800 (WST),
      list: [ 'one', 'two', 'three' ] },
    }

Note that `name` is still unchanged: it didn't get lowercased, nor trimmed.

### `emptyAsNull`

If this parameter is `true`, then values that would be cast to empty strings will be cast to `null`. This is to be used if you prefer to store `null` on your database rather than empty values.


### `canBeNull`

If this parameter is `true`, then `null` will be accepted as value, and casting and validation will be completely skipped.

### `deserialize`

In some cases, you might want `serialize` to work the other way around: you want to convert a JSON string into an object. This is common if, for example, you want to 1) Receive the data via `req.body` 2) Store the data after `schema.validate()` (any `serialize` field will be serialized) 3) Later on, fetch the data from the database 4) Validate that data against the same schema (in which case, you will use the option `{ deserialize: true }`).

This option, if set to `true`, will make `serialize` work the opposite way: data will be converted back from string to Javascript Objects.

## Per field validation

In the schema, you can define a field as follows:

    age:  { type: 'number', default: 15, min: 10, max: 40, validator: fieldValidatorFunc },

Where `fieldValidatorFunc` is:

    var fieldValidatorFunc =  function( obj, value, fieldName ){
      if( value === 130 ) return 'Age cannot be 130';
      return;
    };

In `fieldValidatorFunc`, the `this` variable is the schema object. If the function returns a string, that will be the error. If it returns nothing, then validation went through.

Note that this validation is synchronous. It's meant to be used to check field sanity.

## Extending the class

The basic schema is there to be extended. You can do so by creating javascript mixins:

    var ExtrasMixin = (superclass) => class extends superclass {

      floatStringType (p) {
        if (typeof (p.value) === 'undefined') return 0.0

        // If Number() returns NaN, fail
        var r = Number(p.value)
        if (isNaN(r)) {
          throw this._typeError(p.fieldName) // ._
        }
        // Return cast value
        return r.toFixed(2)
      }

      capitalizeParam (p) {
        if (typeof (p.value) !== 'string') return
        return  p[0].toUpperCase() + p.slice(1)
      }
    }

Just create a new schema class that "mixes" the mixin:

    var ImprovedSchema = ExtraMixin(Schema)

And use `ImprovedSchema` as the constructor for your schema object.

Now in your schema you can have entries like this (note that 'capitalize' as a parameter and 'floatString' as type):

    age:     { type: 'string', capitalize: true },
    price:   { type: 'floatString' },

The next 2 sections will detail how to write code for new types and new parameters.

### Extending types

Types are defined by casting functions. When `validate()` encounters:

    surname: { type: 'string', lowercase: true },

It looks into the schema for a function called `stringType`. It finds it, so it runs:

    stringType (p) {
      // Undefined: return '';
      if (typeof (p.value) === 'undefined') return ''
      if (p.value === null) return ''

      // No toString() available: failing to cast
      if (typeof (p.value.toString) === 'undefined') {
        throw this._typeError(p.fieldName) // ._
      }

      // Return cast value
      return p.value.toString()
    }

Whatever is returned by this function will be used as the new value for the field, before applying parameters.
If there is a problem, the `_typeError` method is called and an error will be thrown.

The parameters passed to the function are:

* `definition`. The full definition for that field. For example, `{ type: 'string', lowercase: true }`
* `value`. The value of the record for that field
* `fieldName`. The field's name
* `object`. The object that is being worked on. At this stage, it might be partially validated.
* `objectBeforeCast`. The original object that was passed for validation.
* `options`: Options passed to the `validate()` function

### Extending parameters

Parameters are based on the same principle. So, when `validate()` encounters:

    surname: { type: 'string', lowercase: true },

it will look for `this.lowercaseParam()`, which is:

    lowercaseParam (p) {
      if (typeof (p.value) !== 'string') return
      return p.value.toLowerCase()
    }

Or when `validate()` encounters:

      age:     { type: 'number', default: 15, min: 0, max: 150, validator: fieldValidatorFunc },

it will look for `this.maxParam`, which is:

````
    maxParam (p) {
      if (typeof p.value === 'undefined') return
      if (p.definition.type === 'number' && typeof p.value === 'number' && Number(p.value) > p.parameterValue) {
        throw this._paramError(p.fieldName, "Field's value is too high")
      }

      if (p.definition.type === 'string' && p.value.toString && p.value.toString().length > p.parameterValue) {
        throw this._paramError(p.fieldName, 'Field is too low')
      }
    }
````

Whatever is returned by this function will be used as the new value for the field, before applying parameters. If nothing is returned, then the object's value isn't changed (this is useful for parameters like `min` and `max`, which are meant to generate errors more than modifying afield)

If there is an error, `param` functions can use `this._paramError()` which will throw an error.

The parameters passed to `param` functions are:

* `definition`. The full definition for that field. For example, `{ type: 'string', lowercase: true }`
* `value`. The value of the record for that field
* `fieldName`. The field's name
* `object`. The object that is being worked on. At this stage, it might be partially validated.
* `objectBeforeCast`. The original object that was passed for validation.
* `valueBeforeCast`. The value of the field before casting.
* `parameterName`. The parameter's name (e.g. `max`)
* `parameterValue`. The parameter's value (e.g. `10`)
* `options`: Options passed to the `validate()` function

This is identical to values passed to `Type` methods, plyus three extra properties (`valueBeforeCast`, `parameterName` and `parameterValue`)

# API description

This is the full list of functions available with this module:

## `constructor(schemaObject)`

Make up the schema object, assigning the `this.structure` field.

## `xxxType( p )`

Extending function that will define the type `xxx`. It will allow you to use a new type in your schema: `field1: { type: 'xxx' }`

# `xxxParam( p )`

Extending function to define the parameter `xxx`. It will allow you to use a new parameter in your schema: `field1: { type: 'number', xxx: 10 }`. Note that a parameter can apply to _any_ type -- it's up to the parameter helper function to decide what to do.

## `validate( object, options)`

Applies schema casting and parameters to the passed object.

Parameters:

  * `object`. The object to cast and check
  * `options`. Options received by all param and casting functions. Note that the `options` object is passed to all `Type` and `Param` functions. Option properties used by the stock SimpleSchema class are:
   * `onlyObjectValues` (boolean). Used by the class itself.
   * `deserialize` (boolean). Used by the `serialize` type.

## `cleanup()`

Clean up fields with a specific parameter defined.

Parameters:

  * `object` The object to cleanup
  * `parameterName` The name of the parameter that will be hunted down. Any field that in the schema structure has thar parameter fill be deleted from `object`
