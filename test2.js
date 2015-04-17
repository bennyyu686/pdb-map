'use strict';

var fs = require('fs');
var gzip = require('zlib');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var file = fs.readFileSync('./data/eg/4ERW.pdb1.gz');
var contents = gzip.gunzipSync(file).toString();

var protein = parse(contents);
var fingerprint = getFingerprint(protein.atoms);

console.log(protein.experiment);
console.log(JSON.stringify(fingerprint));
