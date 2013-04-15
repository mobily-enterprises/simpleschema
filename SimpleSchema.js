var 
  dummy
, declare = require('simpledeclare')
;

var SimpleSchema = declare( null, {

  constructor: function( structure, options){
    this.structure = structure;
    this.options = typeof( options ) !== 'undefined' ? options : {};

    this.fieldsHash = {}
    for( var k in this.structure ){
      this.fieldsHash[ k ] = true;
    }


  },

  

  // Basic types

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

  numberTypeCast: function( definition, value,  fieldName, failedCasts ){

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
 
  dateTypeCast:function( definition, value, fieldName, failedCasts ){

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

  arrayTypeCast: function( definition, value, fieldName, failedCasts){
    return Array.isArray( value ) ? value : [ value ]
  },

  // Basic parameters
 
  minTypeParam: function( p ){
    if( p.definition.type === 'number' && p.value < p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too low: ' + p.fieldName } );
    }
    if( p.definition.type === 'string' && p.value.length < p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too short: ' + p.fieldName } );
    }
  },

  maxTypeParam: function( p ){
    if( p.definition.type === 'number' && p.value > p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too high: ' + p.fieldName } );
    }

    if( p.definition.type === 'string' && p.value.length > p.parameterValue ){
      p.errors.push( { field: p.fieldName, message: 'Field is too long: ' + p.fieldName } );
    }

  },

  validateTypeParam: function( p ){
    if( typeof( p.parameterValue ) !== 'function' )
      throw( new Error("Validator function needs to be a function, found: " + typeof( p.parameterValue ) ) );

    var r = p.parameterValue.call( p.object, p.object[ p.fieldName ], p.fieldName, p.schema );
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

  serializeTypeParam: function( p ){
    if( p.value ){
      p.object[ p.fieldName ] = JSON.stringify( p.value );
    }
  },

  requiredTypeParam: function( p ){

    if( typeof( p.object[ p.fieldName ]) === 'undefined'  && p.parameterValue ){

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


  _cast: function( object, options ){
 
  /*
      schema: {
        longName: { type: 'string', required: true, notEmpty: true, trim: 35 },
        tag     : { type: 'number', notEmpty: true, max: 30 },
        _id     : { type: 'id', required: true },
        _tabId  : { type: 'id', doNotSave: true },
      }
    */
  
    var type, failedCasts = {};
    var options = typeof(options) === 'undefined' ? {} : options;

    // Scan structure object
    for( var fieldName in this.structure ){

  
      definition = this.structure[ fieldName ];
 
      // Skip casting if so required
      if( Array.isArray( options.skipCast )  && options.skipCast.indexOf( fieldName ) != -1  ){
        continue;
      }
 
      // Run the xxxTypeCast function for a specific type
      if( typeof( this[ definition.type + 'TypeCast' ]) === 'function' ){
        var result = this[ definition.type + 'TypeCast' ](definition, object[ fieldName ], fieldName, failedCasts );
        if( typeof( result ) !== 'undefined' ) object[ fieldName ] = result;

      } else {
        throw( new Error("No casting function found, type probably wrong: " + definition.type ) );
      }

    }
    return failedCasts; 
  },

  _castObjectValues: function( object, options ){

    var type, failedCasts = {};
    var options = typeof(options) === 'undefined' ? {} : options;

    // Scan passed object
    for( var fieldName in object ){

      // Skip casting if so required
      if( Array.isArray( options.skipCast )  && options.skipCast.indexOf( fieldName ) != -1  ){
        continue;
      }
  
      definition = this.structure[ fieldName ];
  
      if( typeof(definition) === 'undefined' ) continue;
  
      // Run the xxxTypeCast function for a specific type
      if( typeof( this[ definition.type + 'TypeCast' ]) === 'function' ){
        var result = this[ definition.type + 'TypeCast' ](definition, object[ fieldName ], fieldName, failedCasts );
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
                parameterValue: definition[ parameter ],
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


    failedCasts = this._cast( object, options );
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
    return SimpleSchema.clone( obj );
  }


  
});


SimpleSchema.clone = function( obj ){
  return  JSON.parse( JSON.stringify( obj ) );
}

exports = module.exports = SimpleSchema;


