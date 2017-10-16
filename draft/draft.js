var crypto = require('crypto');

var height = 1000132;
var truncDelegateList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];

function calc(height) {
    return Math.floor(height / 101) + (height % 11 > 0 ? 1 : 0);
}

var seedSource = calc(height).toString(); // 9903

var currentSeed = crypto.createHash('sha256').update(seedSource).digest();

for (var i = 0, delCount = truncDelegateList.length; i<delCount; i++) {
    console.log(i);

    for (var x = 0; x < 4 && i < delCount; i++, x++) {
        var newIndex = currentSeed[x] % delCount;
        var b = truncDelegateList[newIndex];
        truncDelegateList[newIndex] = truncDelegateList[i];
        truncDelegateList[i] = b;
        console.log(i + '.' + x);
    }

    currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
}

console.log(truncDelegateList); // [ 'j', 'k', 'f', 'e', 'd', 'c', 'h', 'i', 'g', 'a', 'b' ]
