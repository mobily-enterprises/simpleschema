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

    // Create an object
    var obj = { name: "Tony", age: "30" };

    // Make a copy before casting
    newObj = Schema.clone( obj );
    
    // Cast the object, assigning defaults etc.
    personSchema.cast( newObj ); // { name: "Tony", age: 30 } 
    personSchema.check( newObj, obj, errors, { myOption: 1 } ); //  { name: "Tony", age: 30, rank: 99 }
    
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
      age:     { type: 'number', default: min: 10, max: 20, validator: validatorFunc },
      id:      { type: 'id' },
      date:    { type: 'date' },
      list:    { type: array },
    });

Note:

 * The order matters. Parameters are processed in the order they are encountered. If you have `{ default: 'something', uppercase: true }`, the result will be `Something`.
 * `min`, `max` only apply to `number`s
 * `uppercase`, `lowercase`, `trim` only apply to `string`s
 * `required` will fail if the _original_ object's corresponding attribute was `undefined` and will never fail for arrays
 * `notEmpty` will fail if the _original_ object's corresponding attribute was `v == ''` and will never fail for arrays
 * If `validatorFunc` returns a string, then an error will be added for that field

## Casting
    
The `cast()` function takes an object and casts its values to the right type for the schema. This means that `"10"` (the string) will become `10` (the number) if the type is "number". Since `cast()` changes the actual object, it's best to make a copy. You should do so using `Schema.clone()`.

## Checking

The `check()` function takes as parameters an object, the object _before_ casting, an array variable, and an options object. `check()` will also manipulate the object as needed (assignin defaults, etc.).

The `errors` array variable will be populated by the `check()` function in case of problems. So, your code should check if the passed variable has grown after the `check()`. The `errors` varialbe will be ab array of objects, in the format:

    [
      { field: 'nameOfFieldsWithProblems', message: 'Message to the user for this field', mustChange: true },
      { field: 'nameOfAnotherField', message: 'Message to the user for this other field', mustChange: false },
    ]

As a result, when there is an error the module will simply `push()` to `errors`:

    if( typeof( r ) === 'string' ) p.errors.push( { field: p.fieldName, message: r, mustChange: true } );

If the object has a field that is not in the schema, it will add an error for that field in `errors`.

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

    // Make a copy before casting
    newObj = Schema.clone( obj );
    
    // Cast the object, assigning defaults etc.
    personSchema.cast( newObj ); // { name: "Tony", age: 30 } 
    personSchema.check( newObj, obj, errors, { myOption: 1 } ); //  { name: "Tony", age: 30, rank: 99 }
    personSchema.validate( obj,  errors, function( err ){
      if( err ){
         next( err );
      } else {

        if( errors.length ){
        // ...
        }

      }
    });
 
Asyncronous validation is much more complex, and it always happens at db-level. It's not possible to implement an async function that performs per-field validation, because `check()` itself is syncronous. While it _is_ possible to turn `check()` into an asyncronous function, this change will also imply a change in the mame of the module, from `simpleschema` to `complexschema`.


## Behind the scenes

The Schema class is based on named helper functions.

For casting, for example, when `cast()` encounters:

    surname: { type: 'string', lowercase: true },

It looks into `this` for a function called `stringTypeCast`. It finds it, so it runs:

    stringTypeCast: function( definition, value){ return value.toString(); },

This applies to all of the casting functions.

Parameters are based on the same principle. So, when `check()` encounters:
 
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
 *  `options`: Options passed to the `check()` function

# Use

This module works well when casting and checking data coming from a web form. This is a typical use:


    var Schema = require( 'simpleschema' );

    formSubmit( req, res, next ){

      var errors = [];

      personSchema = new Schema( {
        name: { type: 'string', trim: 20, required: true },
        age: { type: 'number', default: 30, max: 140 },
        rank: { type: 'number', default: 99, max: 99 },
      });

      var body = Schema.clone( body );

      // Do schema and callback functon checks. They will both add to `errors`
      self.schema.cast(  body );
      self.schema.check( body, req.body, errors );

      if( errors.length) {
         // Do what you normally do when there is an error,
         // ...
      }

This ensures that all values are cast appropriately (everything in `req.body` is a string). It's easy to change requirements, and (more importantly) make sure that only the right parameters were passed.




