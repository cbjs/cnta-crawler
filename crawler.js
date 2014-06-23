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

    function clear() {
        if (fs.exists(vcBMP, function(e) {
            if (e) fs.unlink(vcBMP);
        }));
        if (fs.exists(vcJPG, function(e) {
            if (e) fs.unlink(vcJPG);
        }));
    }

    // download vcode image
    var vcimage = request({url: root + '/validatecode.asp', jar: cookieJar, timeout: 10000})
        .on('error', function() {
            callback('requestPipeError');
        });
    vcimage.setMaxListeners(0);
    vcimage.pipe(fs.createWriteStream(vcBMP))
        .on('close', function() {
            // convert vcode image format
            exec("convert " + vcBMP + " " + vcJPG + " &>/dev/null", function(err, stdout, stderr) {

                // recognize vcode
                exec("tesseract " + vcJPG + " stdout -psm 7 digits 2>/dev/null", function(err, stdout, stderr) {
                    var vc = stdout.trim();
                    callback(err, cookieJar, vc);
                    clear();
                });
            });
        });
}

exports.download = function(furl, outfile, callback) {
    var retries = 0;
    var MAX_RETRIES = 5;
    download();
    function download() {
        var freq = request({url: furl, timeout: 10000}).on('error', function() {
            if (++retries < MAX_RETRIES) {
                // console.log('retry download %s to %s %d times', furl, outfile, retries);
                download();
            } else {
                if (callback) callback('DownloadFailed');
            }
        });
        freq.setMaxListeners(0);
        freq.pipe(fs.createWriteStream(outfile));
        if (callback) callback();
    }
};

exports.crawl = function(dyzh, callback) {
    var htmlFile = dyzh + ".html";
    var htmlUTF8File = dyzh + ".utf8.html";

    function clear() {
        if (fs.exists(htmlFile), function(e) {
            if (e) fs.unlink(htmlFile);
        });
        if (fs.exists(htmlUTF8File), function(e) {
            if (e) fs.unlink(htmlUTF8File);
        });
    }

    var retries = 0;
    var MAX_RETRIES = 5;
    crawl();

    function crawl() {
        getvc(dyzh, function(err, cookieJar, vc) {
            var result = request({
                url: root + '/selectlogin_1.asp',
                form: {
                    vcode: vc,
                    text_dykh: '',
                    text_dysfzh: '',
                    text_dyzh: dyzh,
                    x: 39,
                    y: 11
                },
                timeout: 10000,
                jar: cookieJar,
                followAllRedirects: true,
                method: 'POST',
                headers: {
                    'Referer': root + '/selectlogin_1.asp',
                    'Host': 'daoyou-chaxun.cnta.gov.cn'
                }
            }).on('error', function() {
                if (++retries < MAX_RETRIES) {
                    //console.log("retry for %s %d times", dyzh, retries);
                    crawl();
                } else {
                    //console.log('get detail error for %s', dyzh);
                    callback('NetworkError');
                }
            });
            result.setMaxListeners(0);

            result.pipe(fs.createWriteStream(htmlFile)).on('close', function() {
                // file format convert
                exec("iconv -f gbk -t utf-8 -o " + htmlUTF8File + " " + htmlFile, function(err, stdout, stderr) {

                    fs.readFile(htmlUTF8File, function(err, data) {

                        if (!data) {
                            //console.log('wrong html for %s', dyzh);
                            callback('WrongHtml');
                            return;
                        }
                        
                        // err (wrong vc) retry mech
                        if (data.toString().indexOf('验证码输入错误') != -1) {
                            clear();
                            if (++retries < MAX_RETRIES) {
                                //console.log("retry for %s %d times", dyzh, retries);
                                crawl();
                            } else {
                                //console.log('wrong vc for %s', dyzh);
                                callback('WrongVC');
                            }
                            return;
                        }

                        // err (wrong dyzh) retry mech
                        if (data.toString().indexOf('无此导游信息') != -1) {
                            clear();
                            //console.info('dyzh not exist for %s', dyzh);
                            callback('DYZHNotExist');
                            return;
                        }

                        // try parse html
                        $ = cheerio.load(data.toString());
                        var tds = $("td");

                        if (tds.length < 40) {
                            //console.info('wrong format for %s', dyzh);
                            callback('WrongFormat'); 
                            clear(); 
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

                        clear();
                    });
                });
            });
        });
    } // end of crawl

}; // end of exports.crawl
