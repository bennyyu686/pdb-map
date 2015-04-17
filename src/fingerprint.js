'use strict';

var Matrix = require('ml-matrix');
var euclidean = require('ml-distance').euclidean;

function getFingerprint(atoms) {
    //console.log('ATOMS');
    //console.log(atoms.length);
    //console.log('BEFORE');
    //console.log(atoms[1].coordinates);
    normalizeCoordinates(atoms);
    //console.log('AFTER NORM');
    //console.log(atoms[1].normCoordinates);
    var eigenVectors = getEigenvectors(atoms);
    rotateCoordinates(atoms, eigenVectors);
    var grid = getGrid(atoms);
    var result = getHistograms(grid);
    var finalResult = result[0].normalized.concat(
        result[1].normalized,
        result[2].normalized,
        result[3].normalized
    );
    for (var i = 0; i < finalResult.length; i++) {
        finalResult[i] = (finalResult[i] * 100) | 0;
    }
    return finalResult;
}

module.exports = getFingerprint;

/**
 * Normalize coordinates by dividing by the sum
 * @param atoms
 */
function normalizeCoordinates(atoms) {
    var i;
    var l = atoms.length;
    var sum = [0, 0, 0];

    for (i = 0; i < l; i++) {
        sum[0] += atoms[i].coordinates[0];
        sum[1] += atoms[i].coordinates[1];
        sum[2] += atoms[i].coordinates[2];
    }

    sum[0] /= l;
    sum[1] /= l;
    sum[2] /= l;

    for (i = 0; i < l; i++) {
        var atom = atoms[i];
        atom.normCoordinates = [
            atom.coordinates[0] - sum[0],
            atom.coordinates[1] - sum[1],
            atom.coordinates[2] - sum[2]
        ]
    }
}

/**
 * We need to calculate the covariance matrix and get its eigenvectors to rotate
 * the points
 * @param atoms
 */
function getEigenvectors(atoms) {
    var i, j, k;
    var l = atoms.length;
    var sum = Matrix.zeros(3, 3);

    for (i = 0; i < l; i++) {
        var normCoords = atoms[i].normCoordinates;
        for (j = 0; j < 3; j++) {
            sum[j][j] += normCoords[j] * normCoords[j];
            for (k = j + 1; k < 3; k++) {
                var val = normCoords[j] * normCoords[k];
                sum[j][k] += val;
                sum[k][j] += val;
            }
        }
    }

    // Calculate covariance matrix
    var cov = Matrix.zeros(3, 3);
    for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
            cov[i][j] = sum[i][j] / (l - 1);
        }
    }

    //console.log('COV matrix');
    //console.log(cov[0]);

    // Eigenvalue decomposition
    var evd = Matrix.DC.EVD(cov);

    var eigenVectors = evd.eigenvectorMatrix;
    var eigenValues = evd.realEigenvalues;

    // If a vector is fully negative, we need to invert the values
    for (i = 0; i < 3; i++) {
        var negative = true;
        for (j = 0; j < 3; j++) {
            if (eigenVectors[i][j] >= 0) {
                negative = false;
                break;
            }
        }
        if (negative) {
            for (j = 0; j < 3; j++) {
                eigenVectors[i][j] *= -1;
            }
        }
    }

    // Sort the eigenvalues in decreasing order and eigenvectors with them
    var combined = new Array(3);
    for (i = 0; i < 3; i++) {
        combined[i] = {
            value: eigenValues[i],
            vector: eigenVectors[i]
        }
    }
    combined.sort(function (a, b) {
        return b.value - a.value;
    });
    for (i = 0; i < 3; i++) {
        eigenValues[i] = combined[i].value;
        eigenVectors[i] = combined[i].vector
    }

    //console.log('EIGENVALUES');
    //console.log(eigenValues);

    //console.log('EIGENVECTOR');
    //console.log(eigenVectors[0][0] + " " + eigenVectors[0][1] + " " + eigenVectors[0][2]);
    //console.log(eigenVectors[1][0] + " " + eigenVectors[1][1] + " " + eigenVectors[1][2]);
    //console.log(eigenVectors[2][0] + " " + eigenVectors[2][1] + " " + eigenVectors[2][2]);

    return eigenVectors;
}

function rotateCoordinates(atoms, eigenVectors) {
    var i, j, k;
    var l = atoms.length;

    for (i = 0; i < l; i++) {
        var atom = atoms[i];
        var normCoord = atom.normCoordinates;
        var newCoord = new Array(3);
        atom.newCoordinates = newCoord;
        for (j = 0; j < 3; j++) {
            newCoord[j] = 0;
            for (k = 0; k < 3; k++) {
                newCoord[j] += normCoord[k] * eigenVectors[j][k];
            }
        }
    }

    //console.log('TRANSPOSE');
    //console.log(atoms[1].newCoordinates);
}

/**
 * Returns the min and max values for each axis
 * @param atoms
 */
function getMaxima(atoms) {
    var result = {
        x: [Infinity, -Infinity],
        y: [Infinity, -Infinity],
        z: [Infinity, -Infinity]
    };
    for (var i = 0; i < atoms.length; i++) {
        var atomCoord = atoms[i].newCoordinates;
        if (result.x[0] > atomCoord[0]) {
            result.x[0] = atomCoord[0];
        }
        if (result.x[1] < atomCoord[0]) {
            result.x[1] = atomCoord[0];
        }
        if (result.y[0] > atomCoord[1]) {
            result.y[0] = atomCoord[1];
        }
        if (result.y[1] < atomCoord[1]) {
            result.y[1] = atomCoord[1];
        }
        if (result.z[0] > atomCoord[2]) {
            result.z[0] = atomCoord[2];
        }
        if (result.z[1] < atomCoord[2]) {
            result.z[1] = atomCoord[2];
        }
    }
    
    result.x[0] -= 0.5;
    result.x[1] += 0.5;
    result.y[0] -= 0.5;
    result.y[1] += 0.5;
    result.z[0] -= 0.5;
    result.z[1] += 0.5;
    
    return result;
}

function getGrid(atoms) {
    var maxima = getMaxima(atoms);

    var gridSize = 13;
    var gridSizeXYZ = [
        Math.abs(maxima.x[0]) + Math.abs(maxima.x[1]),
        Math.abs(maxima.y[0]) + Math.abs(maxima.y[1]),
        Math.abs(maxima.z[0]) + Math.abs(maxima.z[1])
    ];
    var gridSpacingXYZ = [
        gridSizeXYZ[0] / (gridSize - 1),
        gridSizeXYZ[1] / (gridSize - 1),
        gridSizeXYZ[2] / (gridSize - 1)
    ];
    var gridX = new Array(gridSize);
    var gridY = new Array(gridSize);
    var gridZ = new Array(gridSize);

    var centerIndex = (gridSize - 1) / 2;

    /*
     Geometric center of the dataset
     */
    var i, j, k;
    var l = atoms.length;

    var cog = [0, 0, 0];
    for (i = 0; i < l; i++) {
        var atomCoord = atoms[i].newCoordinates;
        cog[0] += atomCoord[0];
        cog[1] += atomCoord[1];
        cog[2] += atomCoord[2];
    }

    cog[0] /= l;
    cog[1] /= l;
    cog[2] /= l;

    gridX[centerIndex] = cog[0];
    gridY[centerIndex] = cog[1];
    gridZ[centerIndex] = cog[2];

    for (i = centerIndex + 1; i < gridSize; i++) {
        gridX[i] = gridX[i - 1] + gridSpacingXYZ[0];
        gridY[i] = gridY[i - 1] + gridSpacingXYZ[1];
        gridZ[i] = gridZ[i - 1] + gridSpacingXYZ[2];
    }

    for (i = centerIndex - 1; i >= 0; i--) {
        gridX[i] = gridX[i + 1] - gridSpacingXYZ[0];
        gridY[i] = gridY[i + 1] - gridSpacingXYZ[1];
        gridZ[i] = gridZ[i + 1] - gridSpacingXYZ[2];
    }

    var nBoxes = gridSize * gridSize * gridSize;
    var grid = new Array(nBoxes);
    for (i = 0; i < gridSize; i++) {
        for (j = 0; j < gridSize; j++) {
            for (k = 0; k < gridSize; k++) {
                grid[getIndexFrom3d(i, j, k, gridSize)] = new GridBox(i, j, k);
            }
        }
    }

    for (i = 0; i < l; i++) {
        var position = getAtomGridPosition(atoms[i].newCoordinates);
        atoms[i].gridPosition = position;
        grid[getIndexFrom3d(position[0], position[1], position[2], gridSize)].atoms.push(atoms[i]);
    }

    return grid;

    function getAtomGridPosition(atomXYZ) {
        return [
            Math.floor((atomXYZ[0] - maxima.x[0]) / gridSpacingXYZ[0]),
            Math.floor((atomXYZ[1] - maxima.y[0]) / gridSpacingXYZ[1]),
            Math.floor((atomXYZ[2] - maxima.z[0]) / gridSpacingXYZ[2])
        ];
    }
}

function getIndexFrom3d(x, y, z, size) {
    return x + size * y + size * size * z;
}

function GridBox(x, y, z) {
    this.xGrid = x;
    this.yGrid = y;
    this.zGrid = z;
    this.coordinates = new Array(3);
    this.prop = [0, 0, 0, 0];
    this.atoms = [];
}

function getHistograms(grid) {
    var result = [
        new Result(), // all
        new Result(), // pos
        new Result(), // neg
        new Result()  // hyd
    ];

    var i, j;
    var box, sum, atomL, atom;
    var l = grid.length;

    for (i = 0; i < l; i++) {
        box = grid[i];
        if (box.atoms.length) {
            sum = [0, 0, 0];
            atomL = box.atoms.length;
            for (j = 0; j < atomL; j++) {
                atom = box.atoms[j];
                sum[0] += atom.newCoordinates[0];
                sum[1] += atom.newCoordinates[1];
                sum[2] += atom.newCoordinates[2];
                box.prop[0]++;
                result[0].atomCount++;
                if (atom.kind > 0) {
                    box.prop[atom.kind]++;
                    result[atom.kind].atomCount++;
                }
            }
            box.coordinates[0] = sum[0] / atomL;
            box.coordinates[1] = sum[1] / atomL;
            box.coordinates[2] = sum[2] / atomL;
        }
    }

    for (i = 0; i < l; i++) {
        box = grid[i];
        if (box.atoms.length === 0) continue;
        for (j = i + 1; j < l; j++) {
            var otherBox = grid[j];
            if (otherBox.atoms.length === 0) continue;
            var distance = euclidean(box.coordinates, otherBox.coordinates);

            for (var k = 0; k < 4; k++) {
                if (box.prop[k] > 0 && otherBox.prop[k] > 0) {
                    result[k].distances.push(distance);
                    result[k].weights.push(box.prop[k] * otherBox.prop[k]);
                }
            }
        }
    }

    for (i = 0; i < 4; i++) {
        var data = result[i];
        data.frequency = getHistogram(data.distances, data.weights);
        data.normalized = setWeights(normalize(data.frequency, data.atomCount), i);
    }

    return result;
}

var factors = [1, 5, 5, 2];
function setWeights(array, type) {
    var factor = factors[type];
    if (factor === 1) return array;
    for (var i = 0; i < array.length; i++) {
        array[i] *= factor;
    }
    return array;
}

function normalize(frequency, val) {
    var result = new Array(frequency.length);
    for (var a = 0; a < result.length; a++) {
        if (frequency[a] > 0) {
            result[a] = frequency[a] / Math.pow(val, 1.5);
        }
    }
    return result;
}

function getHistogram(data, weight) {
    var minValue = 0;
    var maxValue = 400;
    var binset = getBitSet();
    var l = binset.length;

    var frequency = new Array(l);
    for (var i = 0; i < l; frequency[i++] = 0);

    for (var a = 0; a < data.length; a++) {
        var val = data[a];
        if (val < minValue) continue;
        if (val > maxValue) continue;

        for (var i = 0; i < l; i++) {
            frequency[i] += weight[a] * Math.exp(-((binset[i]-val)*(binset[i]-val)) / (2*(val*0.09)*(val*0.09)));
        }
    }g
    return frequency;
}

function getBitSet() {
    var result = new Array(34);
    var number = 1.45;
    result[0] = number;
    for (var i = 1; i < 34; i++) {
        number *= 1.18;
        result[i] = number;
    }
    return result;
}

function Result() {
    this.atomCount = 0;
    this.distances = [];
    this.weights = [];
}
