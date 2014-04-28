cnta-crawler
============

crawl tourist guide data from cnta.gov.cn

Prerequisites
-------------
1. [node](http://www.nodejs.org), crawler written mainly in javascript
2. [tesseract-ocr](https://code.google.com/p/tesseract-ocr/), ocr used to identify verfication code.
```
apt-get install tesseract-ocr
```
3. [imagemagick](http://www.imagemagick.org), convert verfication code image from bmp to jpg.
```
apt-get install imagemagick
```
4. [iconv](http://en.wikipedia.org/wiki/Iconv), convert html docs' encoding from gbk to utf8.

Steps
-----
1. `npm install` install all dependencies
2. `node main` run main script
