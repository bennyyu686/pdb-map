'use strict';

var kind = require('./kind');

function parse(pdb) {

    var lines = pdb.split(/[\r\n]+/);

    // TODO find if the file is xray

    var result = [];
    var atomReg = /^ATOM  /;
    var idx = 0;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (atomReg.test(line)) {
            var residue = line.substring(17, 20).trim();
            var type = line.substring(12, 16).trim();
            result.push({
                coordinates: [parseFloat(line.substring(30, 38)), parseFloat(line.substring(38, 46)), parseFloat(line.substring(46, 54))],
                residue: residue,
                atomType: type,
                kind: kind.lookup(type, residue),
                index: idx++
            });
        }
    }

    return result;

}

module.exports = parse;
