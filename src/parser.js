'use strict';

var Atom = require('./atom');

function parse(pdb) {
    var lines = pdb.split(/[\r\n]+/);

    var result = {
        atoms: []
    };

    var eleset = ["C", "N", "O", "S", "P"];

    var pass = true;
    var hetatm = 0;
    var atm = 0;
    var seqres = "";
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var header = line.substring(0, 6);
        if (header === 'HETATM') {
            hetatm++;
        } else if (header === 'ATOM  ') {
            atm++;
        } else if (header === 'SEQRES') {
            seqres += line.substring(19,70).trim()+";"; //store all residues
        }
    }
    //if HETATM is more than 20% of total atoms, remove this pdb.
    var hetperc = hetatm / (hetatm + atm);
    if (hetperc > 0.2) {
        pass = false;
    }

    if (!pass) {
        result.experiment = "ELSE";
        result.idCode = "null";
        result.atoms = "null";
    } else {
        var allocCODE = new Array();
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var header = line.substring(0, 6);
            if (header === 'HEADER') {
                result.idCode = line.substring(62, 66);
            } else if (header === 'EXPDTA') {
                result.experiment = line.substring(10);
            } else if (header === 'ATOM  ') {
                //remove hydrogens
                var element = line.substring(76, 78).trim();
                var natele = false;
                for (var j = 0; j < eleset.length; j++) {
                    if (element === eleset[j]) {
                        natele = true;
                        break;
                    }
                }

                //remove alternative position
                var alloc = line.substring(16, 17).trim();
                var ins = false;
                if (alloc.length > 0) {
                    if (allocCODE.length == 0) {
                        ins = true;
                        allocCODE.push(alloc);
                    } else {
                        if (alloc == allocCODE[0]) {
                            ins = true;
                        }
                    }
                } else {
                    ins = true;
                }

                if (natele && ins) {
                    result.atoms.push(new Atom(
                        line.substring(12, 16).trim(), // type
                        line.substring(17, 20).trim(), // residue
                        [parseFloat(line.substring(30, 38)), parseFloat(line.substring(38, 46)), parseFloat(line.substring(46, 54))] // coordinates
                    ));
                }
            } else if (header === 'HETATM') {//if the hetatm belongs to modified residue, we take it.
                var res = line.substring(17, 20).trim();
                if (res == 'HOH') continue;
                if (res.length == 0) continue;
                var resarray = seqres.trim().replace(/\s+/g,";").split(";");
                if (resarray.indexOf(res) > -1) {
                    //remove hydrogens
                    var element = line.substring(76, 78).trim();
                    var natele = false;
                    for (var j = 0; j < eleset.length; j++) {
                        if (element === eleset[j]) {
                            natele = true;
                            break;
                        }
                    }

                    //remove alternative position
                    var alloc = line.substring(16, 17).trim();
                    var ins = false;
                    if (alloc.length > 0) {
                        if (allocCODE.length == 0) {
                            ins = true;
                            allocCODE.push(alloc);
                        } else {
                            if (alloc == allocCODE[0]) {
                                ins = true;
                            }
                        }
                    } else {
                        ins = true;
                    }

                    if (natele && ins) {
                        result.atoms.push(new Atom(
                            line.substring(12, 16).trim(), // type
                            line.substring(17, 20).trim(), // residue
                            [parseFloat(line.substring(30, 38)), parseFloat(line.substring(38, 46)), parseFloat(line.substring(46, 54))] // coordinates
                        ));
                    }
                }
            }
        }
    }
    return result;
}

module.exports = parse;