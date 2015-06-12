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

var kindsData = {};
kindsData.positive = 'NZ LYS\nCZ ARG';
kindsData.negative = 'CG ASP\nCD GLU\nP';
kindsData.hydrophobic = 'CB ALA\nCG2 THR\nCB VAL\nCG1 VAL\nCG2 VAL\nCB LEU\nCG LEU\nCD1 LEU\nCD2 LEU\nCB ILE\nCG1 ILE\nCG2 ILE\nCD1 ILE\nCB MET\nCB PRO\nCG PRO\nCB PHE\nCD1 PHE\nCD2 PHE\nCG PHE\nCE1 PHE\nCE2 PHE\nCZ PHE\nCB TYR\nCG TYR\nCD1 TYR\nCD2 TYR\nCE1 TYR\nCE2 TYR\nCB TRP\nCG TRP\nCD2 TRP\nCE3 TRP\nCZ2 TRP\nCZ3 TRP\nCH2 TRP\nCB ASP\nCB GLU\nCG GLU\nCB ASN\nCB GLN\nCG GLN\nCB HIS\nCB LYS\nCG LYS\nCD LYS\nCB ARG\nCG ARG\nC5 U\nC7 U\nC2\' U\nC5 T\nC7 T\nC2\' T\nC2\' A\nC2\' C\nC5 C\nC2\' G\nC5 DT\nC7 DT\nC2\' DT\nC2\' DA\nC2\' DC\nC5 DC\nC2\' DG';

var table = {};

for (var i in kinds) {
    var kind = kinds[i];
    var data = kindsData[i];
    var lines = data.split(/[\r\n]+/);
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
