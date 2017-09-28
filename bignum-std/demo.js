var bignum = require('./bignum')


var x = new bignum(123.4567);
var y = new bignum('123456.7e-3');
var z = new bignum(x);

console.log(x.toFixed(2));
console.log(y.toString());
console.log(z);

var b = bignum('782910138827292261791972728324982')
    .sub('182373273283402171237474774728373')
    .div(8);
console.log(b.toFixed(2));
console.log(typeof(b));

console.log(new bignum(1001, 2).toS());

console.log(x.pow(2).toFixed(2));