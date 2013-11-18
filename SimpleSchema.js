/*
Copyright (C) 2013 Tony Mobily

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var 
  dummy
, declare = require('simpledeclare')
;

var SimpleSchema = declare( null, {

  constructor: function( structure, options){
    this.structure = structure;
    this.options = typeof( options ) !== 'undefined' ? options : {};

    // A list of fields in hash format
    this.fieldsHash = {}
    for( var k in this.structure ){
      this.fieldsHash[ k ] = true;
    }
  },


  // Built-in types

  noneTypeCast: function( definition, value, fieldName, options,failedCasts ){
   return value;
  },

  stringTypeCast: function( definition, value, fieldName, options, failedCasts ){

    // Undefined: return '';
    if( typeof( value ) === 'undefined' ) return '';
    if( value === null ) return '';

    // No toString() available: failing to cast
    if( typeof( value.toString ) === 'undefined' ){
      failedCasts[ fieldName ] = true;
      return;
    }

    // Return cast value
    return value.toString();
  },

  numberTypeCast: function( definition, value,  fieldName, options,failedCasts ){

    // Undefined: return 0;
    if( typeof( value ) === 'undefined' ) return 0;

    // If Number() returns NaN, fail
    var r = Number( value );
    if( isNaN( r ) ){
      failedCasts[ fieldName ] = true;
      return;
    }

    // Return cast value
    return r;

  },
 
  dateTypeCast:function( definition, value, fieldName, options, failedCasts ){

    // Undefined: return empty date
    if( typeof( value ) === 'undefined' ){
      return new Date();
    }

    // If new Date() returns NaN, date was not corect, fail
    var r = new Date( value );
    if( isNaN( r ) ){
      failedCasts[ fieldName ] = true;
      return;
    }
  
    // return cast value
    return r;
    
  },

  arrayTypeCast: function( definition, value, fieldName, options, failedCasts){
    return Array.isArray( value ) ? value : [ value ]
  },


  serializeTypeCast: function( definition, value, fieldName, options, failedCasts ){

    var r;

    // CASE #1: it's a string. Serialise it
    if( typeof( value ) === 'string' ){

      try {
          // Attempt to stringify
          r = JSON.parse( value );

          // It worked: return r
          return r;
      } catch( e ){
        failedCasts[ fieldName ] = true;
        return;
      }

    // CASE #2: it's anything but a string. Serialise it.
    } else {

      try {
          // Attempt to stringify
          r = JSON.stringify( value );

          // It worked: return r
          return r;
      } catch( e ){
        failedCasts[ fieldName ] = true;
        return;
      }

    // 
    } 
  },

  // Cast an ID for this particular engine. If the object is in invalid format, it won't
  // get cast, and as a result check will fail
  idTypeCast: function( definition, value,  fieldName, options, failedCasts ){
    return value;
  },



  // Built-in parameters
 
  minTypeParam: function( p ){

    if( p.definition.type === 'number' && p.value && p.value < p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too low: ' + p.fieldName } );
    }
    if( p.definition.type === 'string' && p.value && p.value.length < p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too short: ' + p.fieldName } );
    }
  },

  maxTypeParam: function( p ){
    if( p.definition.type === 'number' && p.value && p.value > p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too high: ' + p.fieldName } );
    }

    if( p.definition.type === 'string' && p.value && p.value.length > p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too long: ' + p.fieldName } );
    }

  },

  validateTypeParam: function( p ){
    if( typeof( p.parameterValue ) !== 'function' )
      throw( new Error("Validator function needs to be a function, found: " + typeof( p.parameterValue ) ) );

    var r = p.parameterValue.call( p.object, p.object[ p.fieldName ], p.fieldName, p.schema );
    if( typeof( r ) === 'string' ) p.errors.push( { field: p.fieldName, message: r } );
  },

  uppercaseTypeParam: function( p ){
    if( typeof( p.value ) !== 'string' ) return;
    return  p.value.toUpperCase();
  },
  lowercaseTypeParam: function( p ){
    if( typeof( p.value ) !== 'string' ) return;
    return  p.value.toLowerCase();
  },

  trimTypeParam: function( p ){
    if( typeof( p.value ) !== 'string' ) return;
    return  p.value.substr( 0, p.parameterValue );
  },

  defaultTypeParam: function( p ){
    var v;
    if( typeof( p.objectBeforeCast[ p.fieldName ] ) === 'undefined' ){
      if( typeof(  p.parameterValue ) === 'function' ){
        v = p.parameterValue.call();
      } else {
        v = p.parameterValue;
      }
      p.object[ p.fieldName ] = v;
    }
  },


  requiredTypeParam: function( p ){

    if( typeof( p.object[ p.fieldName ]) === 'undefined'  && p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field required:' + p.fieldName } );
    }
  },

  notEmptyTypeParam: function( p ){
    // if( ! Array.isArray( p.value ) && ( typeof( p.objectBeforeCast[ p.fieldName ]) === 'undefined' || p.objectBeforeCast[ p.fieldName ] == '')) {
    if( ! Array.isArray( p.value ) &&  p.objectBeforeCast[ p.fieldName ] == '') {
      p.errors.push( { field: p.fieldName, message: 'Field cannot be empty: ' + p.fieldName } );
    }
  },


  // Options and values used: (does NOT pass options to cast functions)
  //  * options.onlyObjectValues             -- Will apply cast for existing object's keys rather than the schema itself
  //  * options.skipCast                     -- To know what casts need to be skipped
  // 
  //  * this.structure[ fieldName ].required -- To skip cast if it's `undefined` and it's NOT required
  //
  _cast: function( object, options, cb ){
 
    var type, failedCasts = {};
    var options = typeof( options ) === 'undefined' ? {} : options;
    var targetObject;
    var resultObject = {};

    // Set the targetObject. If the target is the object itself,
    // then missing fields won't be a problem
    if( options.onlyObjectValues ) targetObject = object;
    else targetObject = this.structure;

    for( var fieldName in targetObject ){
  
      // Getting the definition
      definition = this.structure[ fieldName ];

      // Copying the value over
      if( typeof( object[ fieldName ] ) !== 'undefined' ) resultObject[ fieldName ] = object[ fieldName ] ;
 
      // If the definition is undefined, and it's an object-values only check,
      // then the missing definition mustn't be a problem.
      if( typeof( definition ) === 'undefined' && options.onlyObjectValues ) continue;

      // Skip casting if so required by the skipCast array
       
      if( Array.isArray( options.skipCast )  && options.skipCast.indexOf( fieldName ) != -1  ){
        continue;
      }

      // Skip casting if value is undefined AND required is false in schema
      if( !definition.required && typeof( object[ fieldName ] ) === 'undefined' ){
        continue;
      }

      // Run the xxxTypeCast function for a specific type
      if( typeof( this[ definition.type + 'TypeCast' ]) === 'function' ){
        var result = this[ definition.type + 'TypeCast' ](definition, object[ fieldName ], fieldName, options, failedCasts );
        if( typeof( result ) !== 'undefined' ) resultObject[ fieldName ] = result;

      } else {
        throw( new Error("No casting function found, type probably wrong: " + definition.type ) );
      }

    }

    // That's it -- return resulting Object
    cb( null, resultObject, failedCasts ); 

  },

  // Options and values used: (It DOES pass options to cast functions)
  //  * options.onlyObjectValues             -- Will skip appling parameters if undefined and options.onlyObjectValues is true
  //  * options.skipParams          -- Won't apply specific params for specific fields

  _params: function( object, objectBeforeCast, options, failedCasts, cb ){
  
    var type;
    var options = typeof(options) === 'undefined' ? {} : options;
  
    var errors = [];
    var resultObject = {}


   // First of all, if it's not in the schema, it's not allowed
    for( var k in objectBeforeCast ){
      if( typeof( this.structure[ k ] ) === 'undefined' ){
        errors.push( { field: k, message: 'Field not allowed: ' + k } );
      }
    }

    // Copying object into resultObject
    for( var k in object ){
      if( typeof( object[ k ]) !== 'undefined' ) resultObject[ k ] = object[ k ];
    }

    // Scan schema
    for( var fieldName in this.structure ){

      // The `onlyObjectValues` option is on: skip anything that is not in the object
      if( options.onlyObjectValues && typeof( object[ fieldName ] ) === 'undefined' ) continue;

      if( ! failedCasts[ fieldName ] ) {
        definition = this.structure[ fieldName ];

         // Run specific functions based on the passed options
        for( var parameter in definition ){

          // If it's to be skipped, we shall skip -- e.g. `options.skipParams == { tabId: 'required' }` to
          // skip `required` parameter for `tabId` field
          if( typeof( options.skipParams ) === 'object' && options.skipParams !== null ){
            var skipParams = options.skipParams[ fieldName ];
            if( Array.isArray( skipParams ) && skipParams.indexOf( parameter) !== -1  ) continue;
          }

          if( parameter != 'type' ){
            if( typeof( this[ parameter + 'TypeParam' ]) === 'function' ){
              var result = this[ parameter + 'TypeParam' ]({
                value: resultObject[ fieldName ],
                object: resultObject,
                objectBeforeCast: objectBeforeCast,
                objectBeforeParams: object,
                fieldName: fieldName,
                definition: definition,
                parameterValue: definition[ parameter ],
                schema: this,
                errors: errors,
                options: options,
              } );
              if( typeof( result ) !== 'undefined' ) resultObject[ fieldName ] = result;
            }
          }   
        }
      }   
    }
    cb( null, resultObject, errors );

  },

  _validate: function( finalObject, originalObject, castObject, options, cb ){

    if( typeof( this.options ) === 'object'  && typeof( this.options.validator) === 'function' ){
      this.options.validator( finalObject, originalObject, castObject, options, cb );
    } else {
      cb( null, [] );
    }
  },

  // Options and values used (the ones used by _cast() and _params() together)
  //
  //  * options.onlyObjectValues             -- Will apply cast for existing object's keys rather than the schema itself
  //  * options.skipCast                     -- To know what casts need to be skipped
  //  * options.skipParams                   -- Won't apply specific params for specific fields
  // 
  //  * this.structure[ fieldName ].required -- To skip cast if it's `undefined` and it's NOT required
  //
  // Note that the only special parameter is 'required' -- it's only special because _cast() won't cast
  // it if it's `undefined` and it's not required. Otherwise, casting will make validation fail for unrequired and absent values
  //
  // This will run _cast, _param and _validate
  validate: function( originalObject, options, cb ){
  
    var self = this;
 
    if( typeof( cb ) === 'undefined' ){
      cb = options;
      options = {}
    }

    self._cast( originalObject, options, function( err, castObject, failedCasts ){
      if( err ){
        cb( err );
      } else {
        self._params( castObject, originalObject, options, failedCasts, function( err, paramObject, errors ){

          Object.keys( failedCasts ).forEach( function( fieldName ){
            errors.push( { field: fieldName, message: "Error during casting" } );
          });
          self._validate( paramObject, originalObject, castObject, options, function( err, validateErrors ) {
            if( err ){
              cb( err );
            } else {
              if( Array.isArray( validateErrors ) ){
                cb( null, paramObject, Array.prototype.concat( errors, validateErrors ) );
              } else {
                cb( null, paramObject, errors );
              }
            }
          });
        })
      }
    });
    
  },


  cleanup: function( object, parameterName ){
    newObject = {};
    for( var k in object ){
       if( this.structure[ k ][parameterName] ) {
         delete object [ k ]; 
         newObject[ k ] = object[ k ];
       }
    }
    return newObject;
  },


  // The default id maker (just return a random number )
  // available as an object method
  makeId: function( object, cb ){
    SimpleSchema.makeId( object, cb );
  },

});


SimpleSchema.makeId = function( object, cb ){
  cb( null, Math.floor(Math.random()*10000000) );
},


exports = module.exports = SimpleSchema;


