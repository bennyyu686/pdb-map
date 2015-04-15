'use strict';

var fs = require('fs');
var path = require('path');

var ALL = 0;
var POSITIVE = 1;
var NEGATIVE = 2;
var HYDROPHOBIC = 3;

var kinds = {
    positive: POSITIVE,
    negative: NEGATIVE,
    hydrophobic: HYDROPHOBIC
};

var table = {};

for (var i in kinds) {
    var kind = kinds[i];
    var file = fs.readFileSync(path.join(__dirname, 'kinds', i + '.txt'), 'utf8');
    var lines = file.split(/[\r\n]+/);
    for (var j = 0; j < lines.length; j++) {
        var line = lines[j].split(' ');
        var type = line[0];
        if (!table[type]) {
            table[type] = {};
        }
        if (line[1]) {
            table[type][line[1]] = kind;
        } else {
            table[type] = kind;
        }
    }
}

function lookup(type, residue) {
    var lookType = table[type];
    if (lookType === undefined) {
        return ALL;
    }
    if (typeof lookType === 'number') {
        return lookType;
    }
    var lookResidue = lookType[residue];
    if (lookResidue === undefined) {
        return ALL;
    }
    return lookResidue;
}

exports.lookup = lookup;
