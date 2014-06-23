var crawler = require('./crawler');
crawler.crawl('D-1100-000001', function(err, result) { if (err) {
        console.log(err);
    } else {
        console.log(result);
    }
});
