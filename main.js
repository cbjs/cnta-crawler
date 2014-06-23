var fs = require('fs'),
    async = require('async'),
    mkdirp = require('mkdirp'),
    _ = require('underscore'),
    request = require('request'),
    crawler = require('./crawler');
// mk result dir 
var resultDir = './result';

// read district code
var codes = fs.readFileSync('code').toString().trim().split("\n");

async.eachLimit(codes, 5, function(code, next) {
    var dir = resultDir + "/" + code + "/";
    mkdirp.sync(dir);

    var num = 1, fail = 0;
    async.whilst(
        function() { return num < 999999 && fail < 50; },
        function(callback) {
            var dyzh = "D-" + code + "-" + String("00000" + num).slice(-6);

            console.log(dyzh);

            num++;

            crawler.crawl(dyzh, function(err, result) {
                if (err) fail++;
                
                if (result) {
                    fail = 0;
                    var photo = request({url:result['照片'], timeout:10000}).on('error', function() {
                            console.log('get photo fail for %s', result['照片']);
                    });
                    photo.setMaxListeners(0);
                    photo.pipe(fs.createWriteStream(dir + dyzh + ".head.jpg"));
                    fs.writeFile(dir + dyzh + ".info", _.values(result).join("\t"));
                }

                callback();
            });
        },
        function(err) {
            next();
        }
    );
});
