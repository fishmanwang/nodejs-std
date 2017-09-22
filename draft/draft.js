var _ = require('underscore')._;
_.str = require('underscore.string');
_.mixin(_.str.exports());

var users = [
    {name: 'moe', age: 40},
    {name: 'larry', age: 20},
    {name: 'chen', age: 20}
];

var nums = [5, 4, 3, 2, 1];

var obj = {one: 1, two: 2, three: 3};

var stooges = [{name: 'curly', age: 25}, {name: 'moe', age: 21}, {name: 'larry', age: 23}];

var youngest = _.chain(stooges)
    .sortBy(function (item) {
        return item.age;
    })
    .map(function (item) {
        return item.name + " is " + item.age
    })
    .first()
    .value();


var lyrics = [
    {line: 1, words: "I'm a lumberjack and I'm okay"},
    {line: 2, words: "I sleep all night and I work all day"},
    {line: 3, words: "He's a lumberjack and he's okay"},
    {line: 4, words: "He sleeps all night and he works all day"}
];

var counts = _.chain(lyrics)
    .map(function (line) {
        return line.words.split(' ');
    })
    .flatten()
    .reduce(function (counts, word) {
        counts[word] = (counts[word] || 0) + 1;
        return counts;
    }, {})
    .pairs()
    .sortBy(function(item) {
        return 0 - _.last(item)
    })
    .value();


console.log(
    _.pad('1', 8, '0')
);
