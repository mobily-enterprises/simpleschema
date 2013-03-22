SimpleSchema
=============

SimpleSchema is a _simple_ library to cast, and validate, objects.
It uses [SimpleDeclare - Github](https://github.com/mercmobily/simpleDeclare) in order to define a class. I strongly recommend using SimpleDeclare to create derivative schemas (which are very easy to create).

Here is how to use it:


    var Schema = require( 'simpleschema' );
    var errors = [];

    personSchema = new Schema( {
      name: { type: 'string', trim: 20 },
      age: { type: 'number', default: 30, max: 140 },
      rank: { type: 'number', default: 99, max: 99 },
    });

    // Store the old version of the object just in case
    var oldObj = Schema.clone( obj );

    // Create an object
    var obj = { name: "Tony", age: "30" };

    // Cast the object, assigning defaults etc.
    personSchema.apply( obj, errors, { myOption: 1 } ); //  { name: "Tony", age: 30, rank: 99 }
    
    if( errors.length ){
      // ...
    }

## The schema description

Here is a schema which covers _every_ single possibility in terms of types and parameters (parameters will not be repeated):

    // If it returns a string, then there was an error
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

 * Casting always happens first; note: you can pass the option `skipCast: [ 'one', 'two' ]` if you want to skip casting for those fields
 * If casting fails, the parameters for that field will not be applied (and `errors` will have the casting error)
 * The order matters. Parameters are processed in the order they are encountered. If you have `{ default: 'something', uppercase: true }`, the result will be `Something`.
 * `min`, `max` on `string`s will check the string length; on `number`s will check number value
 * `uppercase`, `lowercase`, `trim` only apply to `string`s
 * `required` will fail if the  object's corresponding attribute (before casting) was `undefined` and will never fail for arrays; note: you can pass the option `notRequired: [ 'one', 'two' ]` to `apply()` if you want to override the field-level `required` option.
 * `notEmpty` will fail if the  object's corresponding attribute was `v == ''` and will never fail for arrays
 * If `validatorFunc` returns a string, then an error will be added for that field



## What apply() does

The `apply()` function takes as parameters 1) The object to manipulate 2) An array which will be populated with errors 3) An options object that will be passed to the functions.
    
The function first of all takes the passed object and casts its values to the right type for the schema. This means that `"10"` (the string) will become `10` (the number) if the type is "number".

It then applies all parameters passed in order.

The `errors` array variable will be populated in case of problems. So, your code should check if the passed variable has grown after the `apply()`. The `errors` varialbe will be ab array of objects, in the format:

    [
      { field: 'nameOfFieldsWithProblems', message: 'Message to the user for this field', mustChange: true },
      { field: 'nameOfAnotherField', message: 'Message to the user for this other field', mustChange: false },
    ]

As a result, when there is an error the module will simply `push()` to `errors`:

    if( typeof( r ) === 'string' ) p.errors.push( { field: p.fieldName, message: r, mustChange: true } );

If the object has a field that is not in the schema, it will add an error for that field in `errors`.

Note: in some cases, you want to define a schema, and then want to `apply()` to it with some exceptions. For example, you might want to `apply()` to a new record, which doesn't yet have an ID. In this case you would:

    // Do schema cast and check for a new record
    self.schema.apply(  body, errors, { notRequired: [ '_id' ], skipCast: [ '_id' ]  } );

## Cleaning up

The module allows you to clean up all fields with a specific attribute set as a non-falsy value:

    var Schema = require( 'simpleschema' );
    var errors = [];

    personSchema = new Schema( {
      name: { type: 'string', trim: 20 },
      age: { type: 'number', default: 30, max: 140 },
      rank: { type: 'number', default: 99, max: 99, doNotSave: true },
    });

    // Create an object
    var obj = { name: "Tony", age: "30" };

    // ...
    personSchema.cleanup( obj, 'doNotSave' );

This is handy when a web form submits extra data that is not for the database, and you want to clean the object up before writing the information to the database.


## Async validator functions

You might want to do some async validation. The in-field validation function is clearly syncronous, as it's meant to be used just for simple validation. However, you can also do more advanced async validation:

    var Schema = require( 'simpleschema' );
    var errors = [];

    personSchema = new Schema(
      {
        name: { type: 'string', trim: 20 },
        rank: { type: 'number', default: 99, max: 99 },
      },
      {
        // Function to validate a whole object asyncronously
        // passed as an option to the schema

        validate: function( object, schema, errors, cb ){
           db.find({ name: object.name } , function( err, doc ){
             if( err ){
               cb( err );
             } else {
               if( doc.name != object.name ){
                  errors.push( { field: 'name', message: 'Name mismatch!' } );
               }
               cb( null );
             }
           }
        },


      }
    );

    // Create an object
    var obj = { name: "Tony", age: "30" };

    // Cast the object, assigning defaults etc.
    personSchema.apply( obj, errors, { myOption: 1 } ); //  { name: "Tony", age: 30, rank: 99 }
    personSchema.validate( obj,  errors, function( err ){
      if( err ){
         next( err );
      } else {

        if( errors.length ){
        // ...
        }

      }
    });
 
Asyncronous validation is much more complex, and it always happens at db-level. It's not possible to implement an async function that performs per-field validation, because `apply()` itself is syncronous. While it _is_ possible to turn `apply()` into an asyncronous function, this change will also imply a change in the mame of the module, from `simpleschema` to `complexschema`.


## Behind the scenes

The Schema class is based on named helper functions.

Everything happens in two phases: casting (using the internal function `_cast()`) and manipulation (using `_check()`).

### Casting

For casting, for example, when `apply()` encounters:

    surname: { type: 'string', lowercase: true },

It looks into the schema for a function called `stringTypeCast`. It finds it, so it runs:

    stringTypeCast: function( definition, value){ return value.toString(); },

This applies to all of the casting functions.

### Checking

Parameters are based on the same principle. So, when `apply()` encounters:
 
    surname: { type: 'string', lowercase: true },

it will look for `this.lowercaseTypeParam()`, which is:

    lowercaseTypeParam: function( p ){
        if( typeof( p.value ) !== 'string' ) return;
        return  p.value.toLowerCase();
    }, 


## Extending a schema

The basic schema is there to be extended. It's very easy to define new types and new parameters: all you need to do is create a new constructor that inherits from Schema:


    var Schema = require( 'simpleschema' );
    var NewSchema = declare( Schema, {

      incrementByTypeParam: function( p ){
        if( typeof( p.value ) !== 'number' ) return;
        return p.value = p.value + p.definitionValue;
      }, 
    });

( _NOTE_ : if the function returns anything but `undefined`, the object's field is assigned to what is returned. So, if you don't want to change the object's value, just `return`.)

Now in your schema you can have entries like:

    age: { type: 'number', incrementBy: 10 },


The `TypeParam` function has a parameter, `p`, which has anything you might possibly need for processing:

 *  `value`: The value of that field for the passed object
 *  `object`: The full passed object
 *  `objectBeforeCast: The full "before-cast" passed object
 *  `fieldName: The make of the field
 *  `definition`: The full definition for that schema field (`{ type: 'number', incrementBy: 10 }`)
 *  `definitionValue`: The value for this particular parameter in the definition
 *  `schema`: The full schema,
 *  `errors`: The array that will be "augmented" with errors
 *  `options`: Options passed to the `apply()` function

# Use

This module works well when casting and checking data coming from a web form. This is a typical use:


    var Schema = require( 'simpleschema' );

    formSubmit( req, res, next ){

      var errors = [];

      personSchema = new Schema( {
        name: { type: 'string', trim: 20, required: true },
        age: { type: 'number', default: 30, max: 140 },
        rank: { type: 'number', default: 99, max: 99, doNotSave: true },
      });

      // Make a copy of req.body
      var body = Schema.clone( req.body );

      // Do schema and callback functon checks. They will both add to `errors`
      personSchema.apply( body, errors );

      if( errors.length) {
         // Do what you normally do when there is an error,
         // ...
      } else {
        // ...

        // use the body.rank attribute...

        // Get the object ready to be written on the database. The field
        // `rank` is not to be part of the DB
        personSchema.cleanup( body, 'doNotSave' );

        // Write `body` to the database
      }

This ensures that all values are cast appropriately (everything in `req.body` is a string). It's easy to change requirements, and (more importantly) make sure that only the right parameters were passed.




