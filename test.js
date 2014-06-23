var crawler = require('./crawler');
crawler.crawl('D-4409-000100', function(err, result) { if (err) {
        console.log(err);
    } else {
        console.log(result);
    }
});
