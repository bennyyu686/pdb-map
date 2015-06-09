'use strict';

var fs = require('fs');
var gzip = require('zlib');
var glob = require('glob');
var join = require('path').join;
var async = require('async');
var ProgressBar = require('progress');

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

    if (process.argv[2] === '--progress') {
        var bar = new ProgressBar('  generating fingerprints [:bar] (:current/:total) :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: files.length
        });
    }

    async.eachSeries(files, treatFile, function (err) {
        if (err) console.error(err);
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
                if (bar) bar.tick();
                cb();
            });
        });
    }
});
