var crawler = require('./crawler');
crawler.crawl('D-3303-003600', function(err, result) { 
  if (err) {
    console.log(err);
  } else {
    console.log(result);
  }
});
