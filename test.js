var crawler = require('./crawler');
crawler.crawl('D-1308-000033', function(err, result) { 
  if (err) {
    console.log(err);
  } else {
    console.log(result);
    crawler.download(result['照片'], 'photo.jpg');
  }
});
