var fs = require('graceful-fs'),
    async = require('async'),
    mkdirp = require('mkdirp'),
    _ = require('underscore'),
    crawler = require('./crawler'),
    hashset = require('hashset-native');

// mk result dir 
var resultDir = './result';

// read district code
var codes = fs.readFileSync('code').toString().trim().split("\n");

// read success data
var success_data = fs.readFileSync('success.data').toString().trim().split("\n");
var success_set = new hashset.string();
_.each(success_data, function(dyzh) {
  success_set.add(dyzh);
});
delete success_data;

async.eachLimit(codes, 5, function(code, next) {
    var dir = resultDir + "/" + code + "/";
    mkdirp.sync(dir);

    var num = 1, fail = 0;
    async.whilst(
        function() { return num < 999999 && fail < 50; },
        function(callback) {
            var dyzh = "D-" + code + "-" + String("00000" + num).slice(-6);
            num++;

            if (success_set.contains(dyzh)) {
              console.log('skip %s', dyzh);
              success_set.remove(dyzh);
              setImmediate(function() { callback(); });
              return;
            }

            console.log('process %s', dyzh);
            crawler.crawl(dyzh, function(err, result) {
                crawler.clear(dyzh);

                if (err) {
                    fail++;
                    console.log("%s %s", dyzh, err);
                }
                
                if (result) {
                    fail = 0;
                    crawler.download(result['照片'], dir + dyzh + ".head.jpg", function() {
                      fs.appendFile(dir + "all.info", _.values(result).join("\t") + "\n", function() {
                        callback();
                      });
                    });
                } else {
                  callback();
                }
            });
        },
        function(err) {
            next();
        }
    );
});
