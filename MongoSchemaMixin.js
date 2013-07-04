var 
  dummy

, declare = require('simpledeclare')
, mongoWrapper = require('mongowrapper')

, ObjectId = mongoWrapper.ObjectId
, checkObjectId = mongoWrapper.checkObjectId

;


var MongoSchemaMixin = declare( null, {

  // Cast an ID for this particular engine. If the object is in invalid format, it won't
  // get cast, and as a result check will fail
  idTypeCast: function( definition, value,  fieldName, failedCasts ){

    if( checkObjectId( value ) ) {
      return ObjectId( value );
    } else {
      failedCasts[ fieldName ] = true;
    }
  },

 // The default id maker (just return a random number )
  // available as an object method
  makeId: function( object, cb ){
    MongoSchemaMixin.makeId( object, cb );
  },

});

MongoSchemaMixin.makeId = function( object, cb ){
  cb( null, ObjectId() );
},

exports = module.exports = MongoSchemaMixin;

