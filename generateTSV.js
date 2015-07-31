'use strict';

var fs = require('fs');
var gzip = require('zlib');
var glob = require('glob');
var path = require('path');
var async = require('async');
var ProgressBar = require('progress');
var program = require('commander');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var config;
try {
    config = require('./config.json');
} catch(e) {
    config = require('./config.default.json');
}

program
    .option('-p, --progress', 'Show progression')
    .option('-n, --use-name', 'Use filename (XXXX pdbs)')
    .option('-o, --out [file]', 'Output in a file')
    .parse(process.argv);

glob('**/*.pdb1.gz', {
    cwd: config.data
}, function (err, files) {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    var out = process.stdout;
    if (program.out) {
        out = fs.createWriteStream(program.out);
    }

    if (program.progress) {
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
        fs.readFile(path.join(config.data, file), function (err, data) {
            if (err) return cb(err);
            var fileName = path.parse(file).name;
            try {
                var contents = gzip.gunzipSync(data).toString();
                if (program.useName) {
                    contents = contents.replace(/^(.*)XXXX(.*)/, '$1' + fileName.toUpperCase() + '$2');
                }
                var protein = parse(contents);
                if (protein.experiment.indexOf('DIFFRACTION') > 0) {
                    var fingerprint = getFingerprint(protein.atoms);
                    out.write(protein.idCode + '\t' + fingerprint.join('\t') + '\n');
                }
                if (program.progress) bar.tick();
            } catch (e) {
                process.stderr.write('unzip failed: ' + file + '\n');
            }
            cb();
        });
    }
});
