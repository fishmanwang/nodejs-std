var mysql = require('mysql');

var conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'reddata_new'
});

conn.query('select count(1) count from bbd_enterprise_info', function(err, rows, fields) {
   if (err) throw err;
   console.log(JSON.stringify(rows));
   console.log(JSON.stringify(fields));
   console.log('count: ' + rows[0].count)
});