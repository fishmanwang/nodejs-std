var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));  //extended为false表示使用querystring来解析数据，这是URL-encoded解析器
// parse application/json
app.use(bodyParser.json());

app.use(cookieParser());

app.get('/', function (req, res) {
    //res.cookie('userId', 10, { expires: new Date(Date.now() + 900000), httpOnly: true });
    res.cookie('userId', 10);   // res的cookie函数不受cookie-parser影响
    res.send('Hello World');
});

app.get('/user', function(req, res, next) {
    var userId = req.cookies.userId ? req.cookies.userId : -1;   // req的cookies受cookie-parser影响
    var name = req.query.name ? req.query.name : '';
    var age = req.query.age ? parseInt(req.query.age) : 30;

    res.json({userId: userId, name: name, age: age})
});

app.post('/user', function(req, res, next) {
    var name = req.body.name ? req.body.name : '';              // req.body受body-parser影响
    var age = req.body.age ? parseInt(req.body.age) : 30;

    res.json({name: name, age: age})
});

app.use(function (req, res, next) {
    var err = new Error('404 Not Found');
    next(err);
});

app.use(function (err, req, res, next) {
    if (err) console.log(err);
    res.send(err.message)
});

var server = app.listen(3000, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Service startd, visit: http://%s:%s', host, port);
})