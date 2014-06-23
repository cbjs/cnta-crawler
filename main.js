var fs = require('graceful-fs'),
    async = require('async'),
    mkdirp = require('mkdirp'),
    _ = require('underscore'),
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
                if (err) {
                    fail++;
                    console.log("%s %s", dyzh, err);
                }
                
                if (result) {
                    fail = 0;
                    crawler.download(result['照片'], dir + dyzh + ".head.jpg");
                    fs.appendFile(dir + "all.info", _.values(result).join("\t") + "\n");
                }

                callback();
            });
        },
        function(err) {
            next();
        }
    );
});
