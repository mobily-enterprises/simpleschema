var 
  dummy
, declare = require('simpledeclare')
;

var SimpleSchema = declare( null, {

  constructor: function( structure, options){
    this.structure = structure;
    this.options = typeof( options ) !== 'undefined' ? options : {};
  },


  // Basic types

  idTypeCast: function( definition, value ){ return value; },

  stringTypeCast: function( definition, value){ return value.toString(); },

  numberTypeCast: function( definition, value){ return Number( value ); },
 
  dateTypeCast: function( definition, value){ return new Date( value ); },

  arrayTypeCast: function( definition, value){ return Array.isArray( value ) ? value : [ value ] },

  // Basic parameters
 
  minTypeParam: function( p ){
    if( p.definition.type === 'number' && p.value < definitionValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too low: ' + p.fieldName } );
    }
  },

  maxTypeParam: function( p ){
    if( p.definition.type === 'number' && p.value > p.definitionValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too high: ' + p.fieldName } );
    }
  },

  validateTypeParam: function( p ){
    if( typeof( p.definitionValue ) !== 'function' )
      throw( new Error("Validator function needs to be a function, found: " + typeof( p.definitionValue ) ) );

    var r = p.definitionValue.call( p.object, p.object[ p.fieldName ], p.fieldName, p.schema );
    if( typeof( r ) === 'string' ) p.errors.push( { field: p.fieldName, message: r, mustChange: true } );
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
    return  p.value.substr( 0, p.definitionValue );
  },

  defaultTypeParam: function( p ){
    if( typeof( p.value ) === 'undefined' ){
      p.object[ p.fieldName ] = p.definitionValue;
    }
  },

  serializeTypeParam: function( p ){
    if( p.value ){
      p.object[ p.fieldName ] = JSON.stringify( p.value );
    }
  },

  requiredTypeParam: function( p ){

    if( typeof( p.object[ p.fieldName ]) === 'undefined'){

      // Callers can set exceptions to the rule through `option`. This is crucial
      // to exclude some IDs (for example, POST doesn't have an recordId even though
      // recordId is marked as `required` in the schema
      if( !( Array.isArray( p.options.notRequired )  && p.options.notRequired.indexOf( p.fieldName ) != -1  ) ){

        // The error is definitely there!
        p.errors.push( { field: p.fieldName, message: 'Field required:' + p.fieldName, mustChange: true } );
      }
    }
  },

  notEmptyTypeParam: function( p ){
    if( ! Array.isArray( p.value ) && p.objectBeforeCast[ p.fieldName ] == '' ) {
      p.errors.push( { field: p.fieldName, message: 'Field cannot be empty: ' + p.fieldName, mustChange: true } );
    }
  },


  _cast: function( object ){
  
  /*
      schema: {
        longName: { type: 'string', required: true, notEmpty: true, trim: 35 },
        tag     : { type: 'number', notEmpty: true, max: 30 },
        _id     : { type: 'id', required: true },
        _tabId  : { type: 'id', doNotSave: true },
      }
    */
  
    var type, failedCasts = {};
  
    // Scan passed object
    for( var fieldName in object ){
  
      definition = this.structure[ fieldName ];
  
      if( typeof(definition) === 'undefined' ) return;
  
      // Run the xxxTypeCast function for a specific type
      if( typeof( this[ definition.type + 'TypeCast' ]) === 'function' ){
        var result = this[ definition.type + 'TypeCast' ](definition, object[ fieldName ], failedCasts );
        if( typeof( result ) !== 'undefined' ) object[ fieldName ] = result;

      } else {
        throw( new Error("No casting function found, type probably wrong: " + definition.type ) );
      }

    }
    return failedCasts; 
  },

 
  _check: function( object, objectBeforeCast, errors, options, failedCasts ){
  
    var type;
    var options = typeof(options) === 'undefined' ? {} : options;
  
    if( ! Array.isArray( errors ) ) errors = [];

    // Scan passed object, check if there are extra fields that shouldn't
    // be there
    for( var k in object ){
  
      // First of all, if it's not in the schema, it's not allowed
      if( typeof( this.structure[ k ] ) === 'undefined' ){
        errors.push( { field: k, message: 'Field not allowed: ' + k, mustChange: false } );
      }
    }

    // Scan schema
    for( var fieldName in this.structure ){
      if( ! failedCasts[ fieldName ] ) {
        definition = this.structure[ fieldName ];

         // Run specific functions based on the passed options
        for( var parameter in definition ){
          if( parameter != 'type' ){
            if( typeof( this[ parameter + 'TypeParam' ]) === 'function' ){
              var result = this[ parameter + 'TypeParam' ]({
                value: object[ fieldName ],
                object: object,
                objectBeforeCast: objectBeforeCast,
                fieldName: fieldName,
                definition: definition,
                definitionValue: definition[ parameter ],
                schema: this,
                errors: errors,
                options: options,
              } );
              if( typeof( result ) !== 'undefined' ) object[ fieldName ] = result;
            }
          }   
        }
      }   
    }
  },


  apply: function( object, errors, options ){
   
    var originalObject = this.clone( object );

    failedCasts = this._cast( object );
    Object.keys( failedCasts ).forEach( function( fieldName ){
      errors.push( { field: fieldName, error: "Error during casting" } );
    });
   
    this._check( object, originalObject, errors, options, failedCasts ); 
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


  validate: function( object, errors, cb ){

    if( typeof( this.options ) === 'object'  && typeof( this.options.validate) === 'function' ){
      this.options.validate.call( object, this, errors, cb );
    } else {
      cb( null, true );
    }
  },


  clone: function( obj ){
    SimpleSchema.clone( obj );
  }

});


SimpleSchema.clone = function( obj ){
  return  JSON.parse( JSON.stringify( obj ) );
}

exports = module.exports = SimpleSchema;


