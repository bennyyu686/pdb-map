'use strict';

var fs = require('fs');
var gzip = require('zlib');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var file = fs.readFileSync('./data/vc/2AAI.pdb.gz');
var contents = gzip.gunzipSync(file).toString();

var protein = parse(contents);
var fingerprint = getFingerprint(protein.atoms);

console.log(protein.experiment);
console.log(JSON.stringify(fingerprint));
