var crawler = require('./crawler');
crawler.crawl('D-2202-000002', function(err, result) { if (err) {
        console.log(err);
    } else {
        console.log(result);
    }
});
