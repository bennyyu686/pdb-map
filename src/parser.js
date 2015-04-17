'use strict';

var Atom = require('./atom');

function parse(pdb) {
    var lines = pdb.split(/[\r\n]+/);

    var result = {
        atoms: []
    };

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var header = line.substring(0, 6);
        if (header === 'HEADER') {
            result.idCode = line.substring(62, 66);
        } else if (header === 'EXPDTA') {
            result.experiment = line.substring(10);
        } else if (header === 'ATOM  ') {
            result.atoms.push(new Atom(
                line.substring(12, 16).trim(), // type
                line.substring(17, 20).trim(), // residue
                [parseFloat(line.substring(30, 38)), parseFloat(line.substring(38, 46)), parseFloat(line.substring(46, 54))] // coordinates
            ));
        }
    }

    return result;
}

module.exports = parse;
