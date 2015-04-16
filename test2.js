'use strict';

var fs = require('fs');
var gzip = require('zlib');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var file = fs.readFileSync('./data/eg/4ERW.pdb1.gz');
var contents = gzip.gunzipSync(file).toString();

var atoms = parse(contents);
var fingerprint = getFingerprint(atoms);

console.log(fingerprint);
