var fs = require('fs'),
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
    var vcimage = request({
        url: root + '/validatecode.asp', jar: cookieJar}).pipe(fs.createWriteStream(vcBMP));

    vcimage.on('close', function() {
        // convert vcode image format
        exec("convert " + vcBMP + " " + vcJPG + " &>/dev/null", function(err, stdout, stderr) {

            // recognize vcode
            exec("tesseract " + vcJPG + " stdout -psm 7 digits 2>/dev/null", function(err, stdout, stderr) {
                var vc = stdout.trim();
                callback(err, cookieJar, vc);
                fs.unlink(vcBMP);
                fs.unlink(vcJPG);
            });
        });
    });

}

exports.crawl = function(dyzh, callback) {
    var htmlFile = dyzh + ".html";
    var htmlUTF8File = dyzh + ".utf8.html";

    function clear() {
        fs.unlink(htmlFile);
        fs.unlink(htmlUTF8File);
    }

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
            jar: cookieJar,
            followAllRedirects: true,
            method: 'POST',
            headers: {
                'Referer': root + '/selectlogin_1.asp',
                'Host': 'daoyou-chaxun.cnta.gov.cn'
            }
        }).pipe(fs.createWriteStream(htmlFile));

        result.on('close', function() {
            // file format convert
            exec("iconv -f gbk -t utf-8 -o " + htmlUTF8File + " " + htmlFile, function(err, stdout, stderr) {
                fs.readFile(htmlUTF8File, function(err, data) {
                    $ = cheerio.load(data.toString());
                    var tds = $("td");

                    if (tds.length < 40) {callback('error'); clear(); return; } 

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
}

