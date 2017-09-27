console.log(new Buffer('hello, world!').toString('base64'));

console.log(new Buffer('aGVsbG8sIHdvcmxkIQ==', 'base64').toString());

console.log(new Buffer('hello, world!').toString('hex'));

console.log(new Buffer('68656c6c6f2c20776f726c6421', 'hex').toString());

var buf = new Buffer(24);
buf.writeUInt8(11);
buf.writeUInt8(22, 8);
buf.writeUInt8(33, 16);
//buf.writeUInt8(44, 24);
console.log(buf.readUInt8() + buf.readUInt8(8) + buf.readUInt8(16));
