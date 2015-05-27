'use strict';
var data = require('./maps/data');

function getMapPosition(fingerprints) {
    //get 136 fingerprint bits 
    var FPbits = getBits(fingerprints);
    //read 200 reference fingerprints    
    var refFPs = readFiles("ref200.fp");
    //convert original 136-dimension fingerprint to 200-dimension satellite fingerprint
    var satelliteFP = getSatelliteFP(FPbits, refFPs);

    //read average file
    var avgsArray = readFiles('PDB.avgs');
    var avgs = avgsArray[0].split(' ');

    //read eigenvector/eigenvalue file and extract first three PCs.
    var eWeVArray = readFiles('PDB.eWeV');
    var eWeV = [
        new Array(200), //pc1
        new Array(200), //pc2
        new Array(200)  //pc3
    ];
    for (var j = 0; j < eWeV.length; j++) {
        var contents = eWeVArray[j].split(' ');
        var ev = contents[1].split(';');
        for (var k = 0; k < ev.length; k++) {
            eWeV[j][k] = ev[k];
        }
    }

    //read min and max value from PC1, PC2.
    var minmaxArray = readFiles('PDB.totminmax');
    var minmax = minmaxArray[0].split(' ');

    //normalize fingerprint with average value.
    var normFP = normalizeFPs(satelliteFP, avgs);

    //transpose fingerprint to PC1, PC2 axis.
    var posPC12 = rotateFPs(normFP, eWeV);

    //calculate position of uploaded compound on the map.
    var position = getPosition(posPC12, minmax);

    return position;
}

module.exports = getMapPosition;

/**
 * read files
 * @param filename
 */
function readFiles(filename) {
    var file = data[filename];
    var lines = file.split(/[\r\n]+/);
    var contents = new Array;
    for (var j = 0; j < lines.length; j++) {
        if (lines[j].trim().length == 0) break;
        contents.push(lines[j]);
    }

    return contents;
}

/**
 * read bits from fingerprints
 * @param fingerprints
 */
function getBits(fingerprints) {
    var bits = new Array(136);
    for (var i = 1; i < 137; i++) {
        bits[i - 1] = fingerprints[i];
    }

    return bits;
}

/**
 * calculate new fingerprints in the satellite space
 * @param uploaded fingerprints, array of referece fingerprints
 */
function getSatelliteFP(FP, refFPs) {
    var bits = new Array(refFPs.length);
    for (var i = 0; i < refFPs.length; i++) {
        var d = getCBDDistances(FP, refFPs[i]);

        d = 4328.0 / (d + 4328.0);
        bits[i] = d.toFixed(4);
    }

    return bits;
}

/**
 * calculate city block distance
 * @param uploaded fingerprints, referece fingerprints
 */
function getCBDDistances(db, ref) {
    var distance = 0;
    var elements = ref.split(/\t/);
    var refbits = getBits(elements);
    for (var i = 0; i < refbits.length; i++) {
        var tmp = refbits[i] - db[i];
        distance += Math.abs(tmp);

    }

    return distance;
}

/**
 * Normalize coordinates by dividing by the sum
 * @param fingerprints, avgs
 */
function normalizeFPs(fingerprints, avgs) {
    var l = fingerprints.length;
    var newFP = new Array(l);

    for (var i = 0; i < l; i++) {
        newFP[i] = fingerprints[i] - avgs[i];
    }

    return newFP;
}

/**
 * rotate along the PC1, PC2 axis
 * @param normFP, eWeV
 */
function rotateFPs(normFP, eWeV) {
    var l = normFP.length;
    var newFP = new Array(3);
    for (var j = 0; j < 3; j++) {
        newFP[j] = 0;
        for (var k = 0; k < l; k++) {
            newFP[j] += normFP[k] * eWeV[j][k];
        }
    }

    //console.log('TRANSPOSE');
    //console.log(atoms[0].newCoordinates);
    return newFP
}

/**
 * Returns the min and max values for each axis
 * @param posPC12, minmax
 */
function getPosition(posPC12, minmax) {
    var result = {
        x: 0,
        y: 0
    };
    var colMax = 299;
    var rowMax = 299;
    result.x = Math.floor((posPC12[0] - minmax[0]) * rowMax / (minmax[1] - minmax[0])) + 30;
    result.y = rowMax - (Math.floor((posPC12[1] - minmax[0]) * colMax / (minmax[1] - minmax[0])) - 80);

    return result;
}

module.exports = getMapPosition;