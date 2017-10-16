var es = require('elasticsearch');

function getClient() {
    var client = new es.Client({
        host: 'http://192.168.100.47:9200',
        log: 'error'
    });
    return client;
}

function ping() {
    getClient().ping({
        requestTimeout: 30000
    }, function(error) {
        if (error) {
            console.log('elasticsearch cluster is down!');
        } else {
            console.log('All is well');
        }
    });
}

function search() {
    var client = getClient();;
    client.search({
        index: 'megacorp',
        type: 'employee',
        body: {
            query : {
                match: {
                    first_name: 'wang'
                }
            }
        }
    }).then(function(resp) {
        // hits_in = (result.hits || {}).hits || [];
        var hits = resp.hits;
        if (hits.total == 0) {
            console.log("Empty result");
            return;
        }
        hits = hits.hits;
        hits.forEach(function(hit) {
            console.log(JSON.stringify(hit));
        })
    }, function(err) {
        console.log(err.message);
    })
}

search();