SimpleSchema
=============

PLEASE NOTE
===========

The module is going through some _major_ _major_ changes right now. The API is very different, and the way it works is being improved by 1 million times.
Please come back in a bit to see the amended documentation!



SimpleSchema is a _simple_ library to cast, and validate, objects.
It uses [SimpleDeclare - Github](https://github.com/mercmobily/simpleDeclare) in order to define a class. I strongly recommend using SimpleDeclare to create derivative schemas (which are very easy to create).

SimpleSchema is a required module when you try and use [JsonRestStores - Github](https://github.com/mercmobily/JsonRestStores). SimpleSchema was in fact part of JsonRestStores, and then "taken out" as it's useful in its own right.

Here is how to use it:

    var Schema = require( 'simpleschema' );

    personSchema = new Schema( {
      name: { type: 'string', trim: 20 },
      age:  { type: 'number', default: 30, max: 140 },
      rank: { type: 'number', default: 99, max: 99 },
    },
    {

      // Validation function called by schema.validate() for async validation
      validator: function( object, schema, errors, cb ){

        if( doc.name == 'meh' ){
           errors.push( { field: 'name', message: 'Name mismatch!' } );
        }
        cb( null);
    });


    // Definition of a standard callback

    formSubmit( req, res, next ){

      var errors = [];

      // Make a copy of req.body, as castAndParams _will_ change body. If you are not
      // bothered by changing `req.body`, you can just pass `req.body` to `castAndParams()`
      var body = Schema.clone( req.body );

      // Do schema and callback functon checks. They will both add to `errors`
      personSchema.castAndParams( body, errors );

      // Apply async, record-wise validation which will also enrich the `errors` variable
      personSchema.validate( obj,  errors, function( err ){

        if( err ){
          next( err );
        } else {

          if( errors.length) {
             // Do what you normally do when there is an error,
             // ...
          } else {
            // ...

            // use the body.rank attribute...

            // Get the object ready to be written on the database. The field
            // `rank` is not to be part of the DB
            // Cleanup will delete, from `body`, all fields with `doNotSave` defined in the schema
            personSchema.cleanup( body, 'doNotSave' );

            // Write `body` to the database
            // ...
          }
        }
      })

This ensures that all values are cast appropriately (everything in `req.body` is a string). It's easy to change requirements, and (more importantly) make sure that only the right parameters were passed.

NOTE: It's not possible to implement an async function that performs per-field validation, because `castAndParams()` itself is syncronous. While it would be _technically_ possible to turn `castAndParams()` into an asyncronous function, this would be an overkill since most of them are there for trimmimg and general field fixing.

## The schema description

Here is a schema which covers _every_ single possibility in terms of types and parameters (parameters will not be repeated):

    // If there is an error, the validator function will need to return a string describing it.
    // otherwise, return nothing.
    validatorFunc =  function( obj, value, fieldName, schema ){
      if( value == 'bad' ) return 'error';
      return;
    };

    schema = new Schema( {
      name:    { type: 'string', default: 'something', uppercase: true, trim: 30, required: true, notEmpty: true },
      surname: { type: 'string', lowercase: true },
      data:    { type: 'string', serialize: true },
      age:     { type: 'number', default: 15, min: 10, max: 20, validator: validatorFunc },
      id:      { type: 'id' },
      date:    { type: 'date' },
      list:    { type: array },
    });

Note:

 * Casting always happens first; note: you can pass the option `skipCast: [ 'one', 'two' ]` to `castAndParams()` if you want to skip casting for those fields
 * If casting fails, the parameters for that field will not be applied (and `errors` will have the casting error)
 * The order matters. Parameters are processed in the order they are encountered. If you have `{ default: 'something', uppercase: true }`, the result will be `Something`.
 * `min`, `max` on `string`s will check the string length; on `number`s will check number value
 * `uppercase`, `lowercase`, `trim` only apply to `string`s
 * `required` will fail if the  object's corresponding attribute (before casting) was `undefined` and will never fail for arrays; note: you can pass the option `notRequired: [ 'one', 'two' ]` to `castAndParams()` if you want to override the field-level `required` option.
 * `notEmpty` will fail if the  object's corresponding attribute was `v == ''` (note the weak `==`) and will never fail for arrays
 * If `validatorFunc` returns a string, then an error will be added for that field


## What castAndParams() does

The `castAndParams()` function takes as parameters 1) The object to manipulate 2) An array which will be populated with errors if necessary 3) An `options` object.
    
The function first of all takes the passed object and casts its values to the right type for the schema. This means that `"10"` (the string) will become `10` (the number) if the type is "number".

It then applies all parameters passed in order (the "check" phase).

The `errors` array variable will be populated in case of problems. So, your code should check if the passed variable has grown after the `castAndParams()`. The `errors` varialbe will be an array of objects, in the format:

    [
      { field: 'nameOfFieldsWithProblems', message: 'Message to the user for this field', mustChange: true },
      { field: 'nameOfAnotherField', message: 'Message to the user for this other field', mustChange: false },
    ]

### Parameters passed to `castAndParams()`


`castAndParams()` accepts an `options` object where the following keys are considered:

  * `onlyObjectValues` The `required` parameter won't apply, and casting won't happen, for fields that are not defined in the object. This is useful when casting partial objects (objects where some fields are missing, but the fields that _are_ there should be cast)
  * `skipcast` A list of keys for which casting won't happen. Normally used with `notRequired`
  * `notRequired` A list of keys for which the `required` parameter won't apply. Normally used with `skipCast`

For example, you might want to `castAndParams()` a new record, which doesn't yet have an ID yet (but with some exceptions. In this case you would write:

    // Do schema cast and check for a new record
    self.schema.castAndParams(  body, errors, { notRequired: [ '_id' ], skipCast: [ '_id' ]  } );

The option `skipCast` will ensure that no casting will be applied to the field; the option `notRequired` will ensure that no error is thrown if that field is missing altogether.


#### For the curious minds

`castAndParams()` actually works in two phases:

  * It casts values using the `_cast()` function. `_cast()` will take into account the options `onlyObjectValues` (which will make `_cast()` only work on fields that actually already exist in the object to be cast) and `skipCast` (an array of fields for which casting will be skipped). Casting is actually delegated to _casting function_; however, those function will _not_ have access to the `option` object.

  * It applies schema parameters to the corresponding object fields using `_params()`. Unlike `_cast()`, `_params()` doesn't actually do anything with the `options` object. It simply delegates all functionalities to the _schema params functions_. The only stock function that uses `options` is `requiredTypeParam` which looks for: `onlyObjectValues` (the `required` parameter won't apply to fields that do not exist in the object) and the `notRequired` array (the `required` parameter will be ignored for the fields in the array). 

## Extending a schema

The basic schema is there to be extended. It's very easy to define new types (casting) and new parameters (field manipulation): all you need to do is create a new constructor that inherits from Schema, and add appropriately named methods.

For example:

    var Schema = require( 'simpleschema' );
    var NewSchema = declare( Schema, {

      incrementByTypeParam: function( p ){
        if( typeof( p.value ) !== 'number' ) return; // Only works with numbers
        return p.value = p.value + p.definitionValue;
      }, 

      booleanTypeCast: function( definition, value, fieldName, failedCasts ){
        if( value ) return 1;
        return 0;
      },

    });

Now in your schema you can have entries like:

    age:     { type: 'number', incrementBy: 10 },
    enabled: { type: 'boolean' },

Everything happens in two phases: casting (using the internal function `_cast()`) and manipulation (using `_params()`).

### Types

Types are defined by casting functions. When `castAndParams()` encounters:

    surname: { type: 'string', lowercase: true },

It looks into the schema for a function called `stringTypeCast`. It finds it, so it runs:

    stringTypeCast: function( definition, value, fieldName, failedCasts ){

      // Undefined: return '';
      if( typeof( value ) === 'undefined' ) return '';

      // No toString() available: failing to cast
      if( typeof( value.toString ) === 'undefined' ){
        failedCasts[ fieldName ] = true;
        return;
      }

      // Return cast value
      return value.toString();
    },

Note that the casting function must:

* EITHER return the cast value
* OR return nothing, and add an entry to the fieldCasts hash

### Parameters

Parameters are based on the same principle. So, when `castAndParams()` encounters:
 
    surname: { type: 'string', lowercase: true },

it will look for `this.lowercaseTypeParam()`, which is:

    lowercaseTypeParam: function( p ){
      if( typeof( p.value ) !== 'string' ) return;
      return  p.value.toLowerCase();
    },

Note that the checking function must:

* EITHER return the new value (which will replace the old one)
* OR replace nothing (the original value won't be changed)

The `p` parameter is a hash with the following values:

 *  `value`: The value of that field for the passed object
 *  `object`: The full passed object
 *  `objectBeforeCast: The full "before-cast" passed object
 *  `fieldName: The make of the field
 *  `definition`: The full definition for that schema field (`{ type: 'number', incrementBy: 10 }`)
 *  `definitionValue`: The value for this particular parameter in the definition
 *  `schema`: The full schema,
 *  `errors`: The array that will be "augmented" with errors if necessary
 *  `options`: Options passed to the `castAndParams()` (or `_params`) function


# API description

This is the full list of functions available with this module:

## `constructor()`

Make up the schema object, assigning the `this.structure` field.

Parameters:

  * `schemaObject` The schema structure
  * `options` An optional `options` object which can have:
    * `validator` -- The validator function
    * (that's it for now)

## `xxxTypeCast()`

Helper function that will define the type `xxx`. Used when you have, in your schema, something like `field1: { type: 'xxx' }` 

Parameters:

  * `definition` The schema structure. IF `_cast()` was called with option `onlyObjectValues` the object itself
  * `value` The value of the object field
  * `fieldName` The field name
  * `failedCasts` An object which can be enriched if necessary. Each key is the `fieldName` of a failed cast 

## `_cast()`

The function actually responsible for casting, delegating it to the correct casting function. For example, if the schema has `field1: { type: 'xxx' }` and the object to be cast has `{ field1: 10 }`, `_cast()` will call `xxxTypeCast()` for that field.

Parameters:

  * `object` The object to cast
  * `options` An optional options object.
    * `onlyObjectValues` -- If true, only values already defined in the object will be case. If false, every field defined in the schema structure will be cast even if not present in the object in the first place
    * `skipCast` -- An array of fields for which casting will be skipped

Returns:
  * `failedCasts` An object which can be enriched if necessary. Each key is the fieldName of a failed cast 

NOTE: `options` is not passed to the xxxTypeCast function. Here, `options` solely defines how `_cast()` works. ALSO, note that if  `definition.required` is `false` and the object value is `undefined`, casting won't happen.

# `xxxTypeParam()`

Helper function to define possible parameters (other than "type"). Note that a parameter can apply to _any_ type -- it's up to the parameter helper function to decide what to do.

Parameters:

  * `p` An associative array that will have the field described in the "parameters" paragraph above

NOTE: `options` key is what was passed to `_params()` or `castAndParams()`.

## `_params()`

The function that applies schema parameters to object fields, using the right param function. For example, if the schema has `field1: { type: 'number', xxx:10 }` and the object to be cast has `{ field1: 10 }`, `_param()` will call `xxxTypeParam()` for that field.

Parameters:

  * `object` The object to check/apply parameters to
  * `objectBeforeCast` The object as it was _before_ casting. This is important as some checks will need to be performed to the object before casting actually happened
  * `errors` An array of error objects with fields  `field`, `message` and `mustChange`
  * `options` Options that will be passed to the `xxxTypeParam()` function
  * `failedCasts` Every key is the fieldName of a failed cast. It comes from the `_cast()` function

NOTE: This function doesn't actively use `options` itself. Instead, it passed it to the `xxxTypeParam()` function. The only stock function that uses `options` is `requiredTypeParam` which looks for: `onlyObjectValues` and `notRequired`. However, other non-core functions might use these, or other, parameters.


## `_castAndParams()`

Applies schema casting and parameters to the passed object. To do that, it will use `_cast()` and then `_params()`. `_cast()` returns a list of failed casts, which are then passed to `_params()`.

Parameters:

  * `object` The object to cast and check
  * `errors` An array of error objects with fields  `field`, `message` and `mustChange`
  * `options` Options that will be passed to the `_params()` function, whic in turn will pass it to the `xxxTypeParam()` functions

## `cleanup()`

Clean up fields with a specific parameter defined.

Parameters:

  * `object` The object to cleanup
  * `parameterName` The name of the parameter that will be hunted down. Any field that in the schema structure has thar parameter fill be deleted from `object`
 

## `validate()`

Calls the async `validator()` defined when constructing the schema object.

Parameters:

  * `object` The object to async validate
  * `errors` An array of error objects with fields  `field`, `message` and `mustChange`
  * `cb` The callback, called once the schema's `validation()` function has been called


## `clone()`

Simple helper function to clone an object

Parameters:

  * `object` The object to clone

## `makeId()`

Function that returns a generated unique ID. It could be `ObjectId()` (mongoDB) or a new SEQUENCE number (MariaDB). Specific drivers will tend to rewrite this function.

Parameters:

  * `object` The object for which the unique ID will be created
  * `cb` The callback to call once the ID is created

NOTE: the `makeId()` function is likely to be overridden by driver-specific ones.


## "Class" (or "constructor function") functions

The "Class" itself has the methods `clone()` and `makeId()` available. They are useful as "Class" functions as they might get used by an application while _creating_ an object.


# Driver-specific Mixins

Basic schemas work really well for any database. However, it's handy to have driver-specific schemas which take into consideration driver-specific features.

Driver-specific schemas come in the form of `mixins`: they are basic classes that should be "mixed in" with the main one.

For example:

    var Schema = require('simpleschema')
    var MongoSchemaMixin = require('simpleschema/MongoSchemaMixin.js')


    // Mixing in Schema (the basic class) with MongoSchemaMixin
    MyMongoSchema = declare( [ Schema, MongoSchemaMixin ] );

    person = new MyMongoSchema({
      // ...
    });


## MongoSchemaMixin

The MongoSchemaMixin overloads the following functions:

  * `idTypeCast()` It will cast a field to Mongo's own `ObjectId` type. If the field is not valid, it will fail (by adding a key to `failedCasts`)
  * `makeId()` Rather than using the default id creator, which by default just returns a random number, the overloaded `makeId()` will use Mongo's own `ObjectId()` function. NOTE: `makeId()` is available as an object method, _and_ as a class method


For example:

    var Schema = require('simpleschema')
    var MongoSchemaMixin = require('simpleschema/MongoSchemaMixin.js')


    // Mixing in Schema (the basic class) with MongoSchemaMixin
    MyMongoSchema = declare( [ Schema, MongoSchemaMixin ] );

    person = new MyMongoSchema({
      id:   { type: 'id' },                  // This will use Mongo's makeId casting function
      name: { type: 'string', trim: 20 },
      age:  { type: 'number', default: 30, max: 140 },
      rank: { type: 'number', default: 99, max: 99 },
    });


## MariaSchemaMixin

Coming when MySql support is added
