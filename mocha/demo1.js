var assert = require("assert");
var fs = require('fs');

describe('Array', function(){
    describe('#indexOf()', function(){
        it('should return -1 when the value is not present', function(){
            assert.equal(-1, [1,2,3].indexOf(5));
        })
    })
});

describe('File', function() {

   describe('#readFile()', function() {
       it('should read test.ls without error', function(done) {
           fs.readFile('./mocha/test.ls', function(err) {
               if (err) throw err;
               done();
           })
       })
   })
});