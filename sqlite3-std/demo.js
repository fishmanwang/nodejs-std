var sqlite3 = require('sqlite3');
var async = require('async');

// var db = new sqlite3.Database('../tmp/1.db', function () {
//     db.run("create table test(name varchar(15))", function () {
//         db.run("insert into test values('hello world')", function () {
//             db.all("select * from test", function (err, res) {
//                 if (err) {
//                     console.log(err);
//                 } else {
//                     console.log(JSON.stringify(res))
//                 }
//             });
//         })
//     });
// });


var createDb = function(cb) {
    console.log('create db');
    var db = new sqlite3.Database("../tmp/1.db", function() {
        console.log(1.1)
        cb(null, db);
    })
};

var createTable = function(db, cb) {
    console.log('create table');
    db.run("create table test(name varchar(15))", function () {
        cb(null, db);
    })
};

var insertData = function(db, cb) {
    console.log('insert data');
    db.run("insert into test values('hello world')", function () {
        cb(null, db);
    });
};

var selectData = function(db, cb) {
    db.all("select * from test", function (err, res) {
        if (err) {
            console.log(err);
        } else {
            console.log(JSON.stringify(res))
        }
        cb(null, db)
    });
};



async.waterfall([
    createDb,
    createTable,
    insertData,
    selectData
], function (err, rs) {
    console.log(100);
    console.log(err);
    console.log(rs);
});

// process.exit(1);