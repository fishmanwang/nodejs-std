setImmediate(function() {
    console.log(arguments);
    console.log("延迟行为");
}, null, 'aa')