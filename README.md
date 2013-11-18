SimpleSchema
=============

SimpleSchema is a _simple_ library to validate objects and cast their attributes according to their (schema) types.

It uses [SimpleDeclare - Github](https://github.com/mercmobily/simpleDeclare) in order to define a constructor function (see: 'class'). I strongly recommend using SimpleDeclare to create derivative schemas (which are very easy to create).

SimpleSchema is a required module when you try and use [JsonRestStores - Github](https://github.com/mercmobily/JsonRestStores). SimpleSchema was in fact part of JsonRestStores, and then "taken out" as it's useful in its own right.


# Brief introduction

Here is how to use SimpleSchema:

    var Schema = require( 'simpleschema' );

    personSchema = new Schema( {
      name: { type: 'string', trim: 20 },
      age:  { type: 'number', default: 30, max: 140 },
      rank: { type: 'number', default: 99, max: 99, doNotSave: true },
    },
    {

      // Validation function called by schema.validate() for async validation
      validator: function( object, originalObject, castObject, options, done ){

        if( object.name == 'Tony' ){
           errors.push( { field: 'name', message: 'Tony is not an acceptable name' } );
        }
        done( null);
    });


In a normal node/Express application, you would simply use the `validate()` method of personSchema against `req.body`:

    // Definition of a standard callback

    formSubmit( req, res, next ){

      // Apply async, record-wise validation to req.body
      personSchema.validate( req.body, {}, function( err, newBody, errors ){

        if( err ){
          next( err );
        } else {

          if( errors.length) {
             // Do what you normally do when there is an error,
             // ...
          } else {
            // ...

            // The newBody.rank and newBody.age attributes are now proper Javascript numbers

            // Imagine that the field `rank` is not to be part of the DB.
            // `personSchema.cleanup()` will delete from `newBody` all fields with `doNotSave` defined in the schema
            personSchema.cleanup( newBody, 'doNotSave' );

            // Write `newBody` to the database
            // ...
          }
        }
      })

This ensures that all values are cast appropriately (everything in `req.body` comes as a string, whereas you will want `age` and `rank` as proper Javascript numbers).

Note that in this field:

      rank: { type: 'number', default: 99, max: 99, doNotSave: true },

* `type` is the field type. It means that when running personSchema.validate(), `rank` will be cast as a number
* `default`, `max`, `doNotSave` are the 'field parameters'.

## The schema description: all features

Here is a schema which covers _every_ single feature in terms of types and parameters (parameters will not be repeated):

    // If there is an error, the validator function will need to return a string describing it.
    // otherwise, return nothing.
    var fieldValidatorFunc =  function( obj, value, fieldName ){
      if( value == 0 ) return 'Age cannot be 0';
      return;
    };

    complexSchema = new Schema({
      name:    { type: 'string', default: 'SOMETHING', uppercase: true, trim: 30, required: true, notEmpty: true },
      surname: { type: 'string', lowercase: true },
      age:     { type: 'number', default: 15, min: 10, max: 40, validator: fieldValidatorFunc },
      id:      { type: 'id' },
      date:    { type: 'date' },
      list:    { type: 'array' },
    },
    {
      // Validation function called by schema.validate() for async validation
      validator: function( object, originalObject, castObject, options, done ){
        var errors = [];

        if( object.name == 'Tony' ){
           errors.push( { field: 'name', message: 'Tony is not an acceptable name' } );
        }
        done( null, errors );
      }
    });

Note:

 * Casting to the field's type (depending on `type`) always happens first; parameters are applied afterwards
 * If casting fails, the parameters for that field will not be applied (and `errors` will have the casting error on that field)
 * The order of parameters matters. Parameters are processed in the order they are encountered. If you have `{ default: 'something', uppercase: true }`, the result will be `Something`.
 * `min`, `max` on `string`s will check the string length; on `number`s will check number value
 * `uppercase`, `lowercase`, `trim` will only apply to `string`s
 * `required` will fail if the  object's corresponding attribute (before casting) was `undefined` and will never fail for arrays;
 * `notEmpty` will fail if the  object's corresponding attribute was `v == ''` (note the weak `==`) and will never fail for arrays
 * If `fieldValidatorFunc` returns a string, then an error will be added for that field. Note that this function is synchronous
 * The `validator()` function is applied at object level and is asynchronous.


# Validating against a schema

Validation happens with the `schema.validate()` function:

    complexSchema.validate( object, {}, function( err, validatedObject, errorsArray ){

The `validate()` function takes the following parameters:

 * The object to validate
 * An optional `options` object with extra options
 * A callback, called with `validatedObject` (the new object with validation applied) and `errors` (an array with the list of errors triggered during validation)

Here is an example of basic usage:

    p = {
      name: 'TOny',
      surname: 'MOBILY',
      age: '37',
      id: 3424234424,
      date: '2013-10-10',
      list: [ 'one', 'two', 'three' ]
    }

    complexSchema.validate( p, function( err, newP, errors ){
      // ...
    });

`newP` will be:

    { name: 'TONY',
      surname: 'mobily',
      age: 37,
      id: 3424234424,
      date: Thu Oct 10 2013 08:00:00 GMT+0800 (WST),
      list: [ 'one', 'two', 'three' ] },
      nickname: 'some'
    }

And `errors` will be empty. Note that `age` is now a proper Javascript number, `name` is uppercase and `surname` is lowercase. Note also that `nickname` is 'some' (that is, `SOMETHING` in lower case and trimmed to 4 characters).

## The return `errors` array

The `errors` variable is an array of objects; each element contains `field` (the field that had the error) and `message` (the error message for that field). For example:

    [
      { field: 'age', message: 'Age cannot be 0' },
      { field: 'name', message: 'Name not valid' }
    ]

A field can potentially have more than one error message attached to it.

## The `options` object

The second parameter of `schema.validate()` is an (optional) options object. Possible values are:

### `onlyObjectValues`

This option allows you to apply `schema.validate()` only to the fields that are actually defined in the object, regardless of what was required and what wasn't. This allows you to run `schema.validate()` against partial objects. For example:

    p = {
      nickname: 'MERCMOBILY',
    }

    complexSchema.validate( p, { onlyObjectValues: true }, function( err, newP, errors ){
      // ...
    });


`newP` will be:

    { nickname: 'MERC' }

Note that only what "was there" was processed (it was cast and had parameters assigned).


### `skipCast`


The option `skipCast` is used when you want to skip casting for specific fields.

    p = {
      name: 'TOny',
      surname: 'MOBILY',
      age: '37',
      id: 3424234424,
      date: '2013-10-10',
      list: [ 'one', 'two', 'three' ]
    }

    complexSchema.validate( p, { skipCast: 'age' }, function( err, newP, errors ){
      // ...
    });

`newP` will be (note that '37' is still a string):

   { name: 'TONY',
      surname: 'mobily',
      age: '37',
      id: 3424234424,
      date: Thu Oct 10 2013 08:00:00 GMT+0800 (WST),
      list: [ 'one', 'two', 'three' ] },
      nickname: 'some'
    }


### `skipParams`

The option `skipParams` is used when you want to decide which parameters you want to skip for which fields.

    p = {
      name: 'TOny',
      surname: 'MOBILY',
      age: '37',
      id: 3424234424,
      date: '2013-10-10',
      list: [ 'one', 'two', 'three' ]
    }

    complexSchema.validate( p, { skipParams: { nickname: [ 'lowercase', 'trim' ] } }, function( err, newP, errors ){
      // ...
    });

`newP` will be (note that 'SOMETHING' is still capital letters, and it's not trimmed):

    { name: 'TONY',
      surname: 'mobily',
      age: 37,
      id: 3424234424,
      date: Thu Oct 10 2013 08:00:00 GMT+0800 (WST),
      list: [ 'one', 'two', 'three' ] },
      nickname: 'SOMETHING'
    }

## The 'required' parameter is special

All field types and parameters are completely equal as far as `validate()` is concerned -- except one: `required`.

The `required` parameter is special in two ways:

1) `validate()` won't attempt to cast an object value if it's `undefined` and `requred` is `false`. If `required` weren't special, casting (and therefore validation as a whole) would (erroneously) fail for values that are both optional and missing.

2) If you want to safely skip `required` as a parameter, you will also need to turn off casting for that field. If you don't, then casting will likely fail (as it will try to cast from `undefined`). If for example you wanted to make `id` optional rather than required, you would run validate this way:

    complexSchema.validate( p, { skipCast: 'id', skipParams: { id: [ 'required' ] } }, function( err, newP, errors ){


## (Per-field) sync and (object-wide) async validation

You can use functions to validate data. There are two cases:

### Per field, sync validation

In the schema, you can define a field as follows:

    age:  { type: 'number', default: 15, min: 10, max: 40, validator: fieldValidatorFunc },

Where `fieldValidatorFunc` is:

    var fieldValidatorFunc =  function( obj, value, fieldName ){
      if( value == 0 ) return 'Age cannot be 0';
      return;
    };

In `fieldValidatorFunc`, the `this` variable is the schema object. If the function returns a string, that will be the error. If it returns nothing, then validation went through.

Note that this validation is synchronous. It's meant to be used to check field sanity.

### Object-wide, async  validation

The second parameter of the construction object is a hash. If the `validator` key is set, that function will be used for validation. One bonus of this function is that it's asynchronous. This function is there in cases where you need more complex, asynchronous validation that relies on running asynchronous functions.

For example:

    complexSchema = new Schema({
      name:    { type: 'string', lowercase: true, trim: 30, required: true, notEmpty: true },
      surname: { type: 'string', uppercase: true, trim: 50, required: true, notEmpty: true },
    },
    {
      validator: function( object, originalObject, castObject, options, done ){
        var errors = [];

        db.collection.bannedNames.find( { name: object.name }, function( err, docs ){
          if( err ){
            done( err );
          } else {
            if( docs.length ){
              errors.push( { field: 'name', message: 'Name not valid or not allowed' } );
            }
            done( null, errors );
          }
        });

      }
    });

Note that you have several versions of the object: `object` is the object once all casting and all parameters are applied to it; `originalObject` is the one passed originally to `validate()`; `castObject` is the object with only casting applied to it. 

You also have access to the `options` passed when you did run `validate()`. For example, you could do:

    asyncValidatedSchema = new Schema({
      name:    { type: 'string', lowercase: true, trim: 30, required: true, notEmpty: true },
      surname: { type: 'string', uppercase: true, trim: 50, required: true, notEmpty: true },
    },
    {
      validator: function( object, originalObject, castObject, options, done ){
        var errors = [];

        // Check options, skip check if `skipDbCheck` was passed
        if( options.skipDbCheck ){ return done( null, [] ) }

        db.collection.bannedNames.find( { name: object.name }, function( err, docs ){
          if( err ){
            done( err );
          } else {
            if( docs.length ){
              errors.push( { field: 'name', message: 'Name not valid or not allowed' } );
            }
            done( null, errors );
          }
        });

      }
    });

    var p = { name: 'Tony', surname: 'Mobily' };

    asyncValidatedSchema.validate( p, { skipDbCheck: true }, function( err, newP, errors ){
      if( err ){
        console.log('Callback failed:");
        console.log( err );
      } else {
        console.log("Validation errors:");
        console.log( errors );
    });

#### For the curious minds

`validate()` actually works in two phases:

  * Runs `_cast()` to cast object values to the right type. Casting is actually delegated to _casting functions_ (for example, `booleanTypeCast()` for the type `boolean`). `_cast()` will take into account the options `onlyObjectValues` (which will make `_cast()` only work on fields that actually already exist in the object to be cast, allowing you to cast partial objects) and `skipCast` (an array of fields for which casting will be skipped).

  * Runs `_params()` to apply schema parameters to the corresponding object fields. Just like `_cast()`, this function simply delegates all functionalities to the _schema params functions_ (for example, `uppercaseTypeParam()`). `_params()` will take into account of the option `skipParams`, which allows you to decide what parameters should _not_ be applied to specific fields.


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

Types are defined by casting functions. When `validate()` encounters:

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
* OR return nothing, and add an entry to the failedCasts hash

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
* OR return nothing (the original value won't be changed)

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

# `xxxTypeParam()`

Helper function to define possible parameters (other than "type"). Note that a parameter can apply to _any_ type -- it's up to the parameter helper function to decide what to do.

Parameters:

  * `p` An associative array that will have the field described in the "parameters" paragraph above

NOTE: `options` key is what was passed to `_params()` or `castAndParams()`.

## `validate()`

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
 

## `makeId()`

Function that returns a generated unique ID. It could be `ObjectId()` (mongoDB) or a new SEQUENCE number (MariaDB). Specific drivers will tend to rewrite this function.

Parameters:

  * `object` The object for which the unique ID will be created
  * `cb` The callback to call once the ID is created

NOTE: the `makeId()` function is likely to be overridden by driver-specific ones.


## "Class" (or "constructor function") functions

The "Class" itself has the method `makeId()` available. They are useful as "Class" functions as they might get used by an application while _creating_ an object.


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
