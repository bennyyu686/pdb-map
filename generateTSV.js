'use strict';

var fs = require('fs');
var gzip = require('zlib');
var glob = require('glob');
var join = require('path').join;

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var config = require('./config.json');

glob('**/*.gz', {
    cwd: config.data
}, function (err, files) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    files.forEach(treatFile);
});

function treatFile(file) {
    var data = fs.readFileSync(join(config.data, file));
    var contents = gzip.gunzipSync(data).toString();
    var protein = parse(contents);
    if (protein.experiment.indexOf('DIFFRACTION') > 0) {
        var fingerprint = getFingerprint(protein.atoms);
        process.stdout.write(protein.idCode + '\t' + fingerprint.join('\t') + '\n');
    }
}
