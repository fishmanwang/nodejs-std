var sqlite3 = require('sqlite3');
var async = require('async');

var db = new sqlite3.Database('../tmp/1.db');

db.serialize(function() {

    var stmt = db.prepare('insert into test values(?)');

    var rnd;
    for (var i=0; i<10; i++) {
        rnd = Math.floor(Math.random()*1000000);
        stmt.run('wang' + rnd);
    }

    stmt.finalize();

});
// process.exit(1);