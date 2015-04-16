'use strict';

var fs = require('fs');
var gzip = require('zlib');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var file = fs.readFileSync('./data/eg/4ERW.pdb1.gz');
var contents = gzip.gunzipSync(file).toString();

var atoms = parse(contents);
var fingerprint = getFingerprint(atoms);

function logSums(fp) {
    for (var i = 0; i < 4; i++) {
        var v = i*34;
        var sum = 0;
        for (var j = v; j < v+34; j++) {
            sum += fp[j];
        }
        console.log(sum);
    }
}

logSums(fingerprint);

console.log(JSON.stringify(fingerprint));