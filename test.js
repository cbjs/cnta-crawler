var crawler = require('./crawler');
crawler.crawl('X-4409-000100', function(err, result) { if (err) {
        console.log(err);
    } else {
        console.log(result);
    }
});
