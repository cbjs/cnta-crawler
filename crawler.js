var fs = require('graceful-fs'),
    cheerio = require('cheerio'),
    _ = require('underscore'),
    request = require('request'),
    exec = require('child_process').exec;

var root = 'http://daoyou-chaxun.cnta.gov.cn/single_info';

// get a vc & session cookie
function getvc(dyzh, callback) {
    var cookieJar = request.jar();
    var vcBMP = dyzh + '.vc.bmp';
    var vcJPG = dyzh + ".vc.jpg";

    // download vcode image
    request({url: root + '/validatecode.asp', jar: cookieJar, timeout: 20000, encoding: null}, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            fs.writeFile(vcBMP, body, function(err) {
                if (!err) {
                    // convert vcode image format
                    exec("convert " + vcBMP + " " + vcJPG + " &>/dev/null", function(err, stdout, stderr) {
                        // recognize vcode
                        exec("tesseract " + vcJPG + " stdout -psm 7 digits 2>/dev/null", function(err, stdout, stderr) {
                            var vc = stdout.trim();
                            callback(err, cookieJar, vc);
                        });
                    });
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    }).on('error', function(err) {
        console.log('getvc %s fail for %s', dyzh, err);
    }).setMaxListeners(0);
}

exports.download = function(furl, outfile, callback) {
    var retries = 0;
    var MAX_RETRIES = 5;
    download();
    function download() {
        request({url: furl, timeout: 20000, encoding: null}, function(err, res, body) {
            if (!err && res.statusCode == 200) {
                fs.writeFile(outfile, body, function(err) {
                    if (callback) callback(err);
                });
            } else {
                if (++retries < MAX_RETRIES) {
                    // console.log('retry download %s to %s %d times', furl, outfile, retries);
                    download();
                } else {
                    if (callback) callback('DownloadFailed');
                }
            }
        })
        .on('error', function(err) {
            console.log('download %s fail for %s', furl, err);
        })
        .setMaxListeners(0);
    }
};

exports.clear = function(dyzh) {
    var suffixes = ['.vc.bmp', '.vc.jpg', '.html', '.utf8.html'];

    _.each(suffixes, function(suffix) {
      var filename = dyzh + suffix;
      if (fs.existsSync(filename)) fs.unlinkSync(filename);
    });
}

exports.crawl = function(dyzh, callback) {
    var htmlFile = dyzh + ".html";
    var htmlUTF8File = dyzh + ".utf8.html";

    var retries = 0;
    var MAX_RETRIES = 5;
    crawl();

    function error_handler(err, toRetry) {
        if (toRetry && ++retries < MAX_RETRIES) {
            console.log("retry for %s %d times, error: %s", dyzh, retries, err);
            crawl();
        } else {
            callback(err ? err : 'RetryError');
        }
    }

    function extract() {
        // file format convert
        exec("iconv -f gbk -t utf-8 -o " + htmlUTF8File + " " + htmlFile, function(err, stdout, stderr) {

            if (err) {
                error_handler(err, true);
                return;
            }

            fs.readFile(htmlUTF8File, function(err, data) {
                if (err) {
                    error_handler(err, true);
                    return;
                }

                if (!data) {
                    error_handler('WrongHtml', true);
                    return;
                }
                
                // err (wrong vc) retry mech
                if (data.toString().indexOf('验证码输入错误') != -1) {
                    error_handler('WrongVC', true);
                    return;
                }

                // err (wrong dyzh) retry mech
                if (data.toString().indexOf('无此导游信息') != -1) {
                    error_handler('DYZHNotExist');
                    return;
                }

                // try parse html
                $ = cheerio.load(data.toString());
                var tds = $("td");

                if (tds.length < 40) {
                    error_handler('WrongFormat', true); 
                    return; 
                } 

                var headPic = root + $("table.table_border_01 td table td img").attr("src").substring(1);
                var fields = {
                    '姓名': 11,
                    '导游证号': 17,
                    '性别': 19,
                    '资格证号': 21,
                    '等级': 23,
                    '导游卡号': 25,
                    '学历': 27,
                    '身份证号': 29,
                    '语种': 31,
                    '区域名称': 33,
                    '民族': 35,
                    '发证日期': 37,
                    '分值': 39,
                    '获惩日期': 41,
                    '获惩类型': 43,
                    '旅行社': 45,
                    '电话': 47,
                    '其它信息': 48
                }

                var result = {'照片': headPic};

                _.each(fields, function(id, field) {
                    result[field] = tds.eq(id).text().trim();
                });

                callback(null, result);
            });
        });
    } // extract

    function crawl() {
        getvc(dyzh, function(err, cookieJar, vc) {
            if (err) {
                error_handler(err, true);
                return;
            }

            request({
                url: root + '/selectlogin_1.asp',
                form: {
                    vcode: vc,
                    text_dykh: '',
                    text_dysfzh: '',
                    text_dyzh: dyzh,
                    x: 39,
                    y: 11
                },
                timeout: 20000,
                jar: cookieJar,
                encoding: null,
                followAllRedirects: true,
                method: 'POST',
                headers: {
                    'Referer': root + '/selectlogin_1.asp',
                    'Host': 'daoyou-chaxun.cnta.gov.cn'
                }
            }, function(err, res, body) {
                if (!err && res.statusCode == 200) {
                    fs.writeFile(htmlFile, body, function(err) {
                        if (err) {
                            error_handler(err, true);
                        } else {
                            extract();
                        }
                    });
                } else {
                    error_handler(err, true);
                }
            }).on('error', function(err) {
                console.log('crawl %s fail for %s', dyzh, err);
            }).setMaxListeners(0);
        }); // getvc

    } // end of crawl

}; // end of exports.crawl
