/**
 * 学号   课程代码    分数
 *  3       2           1
 */


function writeRecord(buf, offset, data) {
    buf.writeUIntBE(data.number, offset, 3);
    buf.writeUInt16BE(data.lesson, offset + 3);
    buf.writeInt8(data.score, offset + 5);
}

function readRecord(buf, offset) {
    return {
        number: buf.readUIntBE(offset, 3),
        lesson: buf.readUInt16BE(offset + 3),
        score: buf.readInt8(offset + 5)
    }
}

function writeList(list) {
    var buf = new Buffer(list.length * 6);
    var offset = 0;
    for (var i=0; i<list.length; i++) {
        writeRecord(buf, offset, list[i]);
        offset += 6;
    }
    return buf;
}

function readList(buf) {
    var offset = 0;
    var list = [];
    while (offset < buf.length) {
        list.push(readRecord(buf, offset));
        offset += 6;
    }
    return list;
}

var list = [
    {number: 100001, lesson: 1001, score: 99},
    {number: 100002, lesson: 1001, score: 88},
    {number: 100003, lesson: 1001, score: 77},
    {number: 100004, lesson: 1001, score: 66},
    {number: 100005, lesson: 1001, score: 55},
];

console.log(list);

var buf = writeList(list);
console.log(buf);

var ret = readList(buf);
console.log(ret);
