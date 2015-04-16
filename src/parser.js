'use strict';

var Atom = require('./atom');

function parse(pdb) {
    var lines = pdb.split(/[\r\n]+/);

    //TODO find if the file is xray

    var result = [];
    var atomReg = /^ATOM  /;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (atomReg.test(line)) {
            result.push(new Atom(
                line.substring(12, 16).trim(), // type
                line.substring(17, 20).trim(), // residue
                [parseFloat(line.substring(30, 38)), parseFloat(line.substring(38, 46)), parseFloat(line.substring(46, 54))] // coordinates
            ));
        }
    }

    return result;
}

module.exports = parse;
