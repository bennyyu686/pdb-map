'use strict';

var fs = require('fs');
var gzip = require('zlib');
var glob = require('glob');
var join = require('path').join;
var async = require('async');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var config;
try {
    config = require('./config.json');
} catch(e) {
    config = require('./config.default.json');
}

glob('**/*.gz', {
    cwd: config.data
}, function (err, files) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    async.eachSeries(files, treatFile, function (err) {
        if (err) console.log(err);
    });
});

function treatFile(file, cb) {
    fs.readFile(join(config.data, file), function (err, data) {
        if (err) return cb(err);
        gzip.gunzip(data, function (err, contents) {
            if (err) return cb(err);
            var protein = parse(contents.toString());
            if (protein.experiment.indexOf('DIFFRACTION') > 0) {
                var fingerprint = getFingerprint(protein.atoms);
                process.stdout.write(protein.idCode + '\t' + fingerprint.join('\t') + '\n');
            }
            cb();
        });
    });
}
