'use strict';

var fs = require('fs');
var gzip = require('zlib');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');
var mapPosition = require('./src/mapPosition');

var file = fs.readFileSync('./data/vc/4ERW.pdb1.gz');
var contents = gzip.gunzipSync(file).toString();

var protein = parse(contents);
var fingerprint = getFingerprint(protein.atoms);
var position = mapPosition(fingerprint);

console.log(protein.experiment);
console.log(JSON.stringify(fingerprint));
console.log('position', position);
