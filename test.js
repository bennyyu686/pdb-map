'use strict';

var parse = require('./src/parser');
var fs = require('fs');
var gzip = require('zlib');
var Matrix = require('ml-matrix');
var Euclidean = require('ml-distance').euclidean;

var file = fs.readFileSync('./data/eg/4ERW.pdb1.gz');
var contents = gzip.gunzipSync(file).toString();

var result = parse(contents);

/*
Normalization
 */
var l = result.length;
var sum = [0, 0, 0];
for (var i = 0; i < l; i++) {
    sum[0] += result[i].coordinates[0];
    sum[1] += result[i].coordinates[1];
    sum[2] += result[i].coordinates[2];
}

sum[0] /= l;
sum[1] /= l;
sum[2] /= l;

var normArray = new Array(l);

for (var i = 0; i < l; i++) {
    var atom = result[i];
    normArray[i] = [
        atom.coordinates[0] - sum[0],
        atom.coordinates[1] - sum[1],
        atom.coordinates[2] - sum[2]
    ];
}

/*
Covariance matrix
 */
var sum = Matrix.zeros(3, 3);
for (var i = 0; i < l; i++) {
    for (var j = 0; j < 3; j++) {
        sum[j][j] += normArray[i][j] * normArray[i][j];
        for (var k = 0; k < 3; k++) {
            sum[j][k] += normArray[i][j] * normArray[i][k];
            sum[k][j] += normArray[i][j] * normArray[i][k];
        }
    }
}
var cov = Matrix.zeros(3, 3);
for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
        cov[i][j] = sum[i][j] / (l - 1);
    }
}

var evd = Matrix.DC.EVD(cov);

var eigenVectors = evd.eigenvectorMatrix;
var eigenValues = evd.realEigenvalues;

/*
If a vector is fully negative, we need to invert the values
 */
for (var i = 0; i < eigenVectors.length; i++) {
    var max = -Infinity;
    var highestIndex = 0;
    for (var j = 0; j < eigenVectors[i].length; j++) {
        if (Math.abs(eigenVectors[i][j]) > max) {
            max = Math.abs(eigenVectors[i][j]);
            highestIndex = j;
        }
    }
    if (eigenVectors[i][highestIndex] < 0) {
        for (var j = 0; j < eigenVectors[i].length; j++) {
            eigenVectors[i][j] *= -1;
        }
    }
}

/*
Sort the eigenvalues in decreasing order and eigenvectors with them
 */
var orderedVectors = new Array(3);
var added = new Array(3);
for (var i = 0; i < 3; added[i++] = false);
var orderedValues = new Array(3);
for (var i = 0; i < 3; added[i++] = 0);

for (var i = 0; i < eigenValues.length; i++) {
    var max = 0;
    var ev = -Infinity;
    for (var j = 0; j < eigenValues.length; j++) {
        if (!added[j]) {
            if (eigenValues[j] > ev) {
                ev = eigenValues[j];
                max = j;
            }
        }
    }
    added[max] = true;
    orderedVectors[i] = eigenVectors[max];
    orderedValues[i] = ev;
}

/*
Calculate new coordinates
 */
var xyz = normArray;
var newxyz = Matrix.zeros(xyz.length, 3);
for (var i = 0; i < xyz.length; i++) {
    for (var j = 0; j < xyz[i].length; j++) {
        for (var k = 0; k < eigenVectors.length; k++) {
            newxyz[i][j] += xyz[i][k] * orderedVectors[j][k];
        }
    }
}

/*
 Find extreme values for each axis
 [minX, maxX, minY, maxY, minZ, maxZ]
 */
var minMaxPC = new Array(6);
minMaxPC[0] = Infinity;
minMaxPC[1] = -Infinity;
minMaxPC[2] = Infinity;
minMaxPC[3] = -Infinity;
minMaxPC[4] = Infinity;
minMaxPC[5] = -Infinity;

for (var i = 0; i < xyz.length; i++) {
    if (minMaxPC[0] > newxyz[i][0]) {
        minMaxPC[0] = newxyz[i][0];
    }
    if (minMaxPC[1] < newxyz[i][0]) {
        minMaxPC[1] = newxyz[i][0];
    }
    if (minMaxPC[2] > newxyz[i][1]) {
        minMaxPC[2] = newxyz[i][1];
    }
    if (minMaxPC[3] < newxyz[i][1]) {
        minMaxPC[3] = newxyz[i][1];
    }
    if (minMaxPC[4] > newxyz[i][2]) {
        minMaxPC[4] = newxyz[i][2];
    }
    if (minMaxPC[5] < newxyz[i][2]) {
        minMaxPC[5] = newxyz[i][2];
    }
}

/*
Create the 3D grid
 */

var GRIDSIZE = 12;

var gridSize = GRIDSIZE;
if (gridSize % 2 === 0) {
    gridSize += 1;
}

var gridSizeXYZ = [
    Math.abs(minMaxPC[0]) + Math.abs(minMaxPC[1]),
    Math.abs(minMaxPC[2]) + Math.abs(minMaxPC[3]),
    Math.abs(minMaxPC[4]) + Math.abs(minMaxPC[5])
];

var gridSpacingXYZ = [
    (gridSizeXYZ[0] + 1) / (gridSize - 1),
    (gridSizeXYZ[1] + 1) / (gridSize - 1),
    (gridSizeXYZ[2] + 1) / (gridSize - 1)
];

var gridX = new Array(gridSize);
var gridY = new Array(gridSize);
var gridZ = new Array(gridSize);

var centerIndex = (gridSize - 1) / 2;

/*
Geometric center of the dataset
 */
var cog = [0, 0, 0];
for (var i = 0; i < newxyz.length; i++) {
    cog[0] += newxyz[i][0];
    cog[1] += newxyz[i][1];
    cog[2] += newxyz[i][2];
}
cog[0] /= newxyz.length;
cog[1] /= newxyz.length;
cog[2] /= newxyz.length;

gridX[centerIndex] = cog[0];
gridY[centerIndex] = cog[1];
gridZ[centerIndex] = cog[2];

for (var a = centerIndex + 1; a < gridX.length; a++) {
    gridX[a] = gridX[a-1] + gridSpacingXYZ[0];
    gridY[a] = gridY[a-1] + gridSpacingXYZ[1];
    gridZ[a] = gridZ[a-1] + gridSpacingXYZ[2];
}

for (var a = centerIndex - 1; a >= 0; a--) {
    gridX[a] = gridX[a+1] - gridSpacingXYZ[0];
    gridY[a] = gridY[a+1] - gridSpacingXYZ[1];
    gridZ[a] = gridZ[a+1] - gridSpacingXYZ[2];
}

var grid = new Array(gridSize);
for (var i = 0; i < gridSize; i++) {
    var y = new Array(gridSize);
    grid[i] = y;
    for (var j = 0; j < gridSize; j++) {
        var z = new Array(gridSize);
        y[j] = z;
        for (var k = 0; k < gridSize; k++) {
            z[k] = new GridBox(i, j, k);
        }
    }
}

function getAtomGridPosition(atomXYZ) {
    return [
        centerIndex + Math.floor((atomXYZ[0] - gridX[centerIndex]) / gridSpacingXYZ[0]),
        centerIndex + Math.floor((atomXYZ[1] - gridY[centerIndex]) / gridSpacingXYZ[1]),
        centerIndex + Math.floor((atomXYZ[2] - gridZ[centerIndex]) / gridSpacingXYZ[2])
    ];
}

for (var i = 0; i < result.length; i++) {
    var position = getAtomGridPosition(newxyz[i]);
    result[i].gridPosition = position;
    grid[position[0]][position[1]][position[2]].atoms.push(result[i]);
}

var lists = [
    [],
    [],
    [],
    []
];

var totalBoxes = gridSize*gridSize*gridSize;
var euclideanMatrix = new Matrix(totalBoxes, totalBoxes);

var distMatrixAll = [];
var distMatrixPos = [];
var distMatrixNeg = [];
var distMatrixHyd = [];
var weightMatrixAll = [];
var weightMatrixPos = [];
var weightMatrixNeg = [];
var weightMatrixHyd = [];

var atomCount = [0, 0, 0, 0];

for (var i = 0; i < gridSize; i++) {
    for (var j = 0; j < gridSize; j++) {
        for (var k = 0; k < gridSize; k++) {
            var box = grid[i][j][k];
            lists[0].push(box);
            atomCount[0]++;
            if (box.atoms.length) {
                var sum = [0, 0, 0];
                var l = box.atoms.length;
                var has = [false, false, false];
                for (var m = 0; m < l; m++) {
                    var atom = box.atoms[m];
                    var idx = atom.index;
                    sum[0] += newxyz[idx][0];
                    sum[1] += newxyz[idx][1];
                    sum[2] += newxyz[idx][2];
                    box.prop[0]++;
                    if (atom.kind > 0) {
                        has[atom.kind] = true;
                        box.prop[atom.kind]++;
                        atomCount[atom.kind]++;
                    }
                }
                if(has[0]) lists[1].push(box);
                if(has[1]) lists[2].push(box);
                if(has[2]) lists[3].push(box);
                box.x = sum[0] / l;
                box.y = sum[1] / l;
                box.z = sum[2] / l;
            }

            for (var m = 0; m < gridSize; m++) {
                for (var n = 0; n < gridSize; n++) {
                    for (var o = 0; o < gridSize; o++) {

                        /*
                        Calculate distances only once per pair and not box with itself
                         */

                        var otherBox = grid[m][n][o];
                        var distance = Euclidean([box.x, box.y, box.z], [otherBox.x, otherBox.y, otherBox.z]);

                        if (box.prop[0] > 0 && otherBox.prop[0] > 0) {
                            distMatrixAll.push(distance);
                            weightMatrixAll.push(box.prop[0] * otherBox.prop[0]);
                        }

                        if (box.prop[1] > 0 && otherBox.prop[1] > 0) {
                            distMatrixPos.push(distance);
                            weightMatrixPos.push(box.prop[1] * otherBox.prop[1]);
                        }

                        if (box.prop[2] > 0 && otherBox.prop[2] > 0) {
                            distMatrixNeg.push(distance);
                            weightMatrixNeg.push(box.prop[2] * otherBox.prop[2]);
                        }

                        if (box.prop[3] > 0 && otherBox.prop[3] > 0) {
                            distMatrixHyd.push(distance);
                            weightMatrixHyd.push(box.prop[3] * otherBox.prop[3]);
                        }

                        //euclideanMatrix[i + j * gridSize + k * gridSize * gridSize][m + n * gridSize + o * gridSize * gridSize] = distance;
                    }
                }
            }
        }
    }
}

var frequencyAll = gethistogram(distMatrixAll, weightMatrixAll);
var frequencyPos = gethistogram(distMatrixPos, weightMatrixPos);
var frequencyNeg = gethistogram(distMatrixNeg, weightMatrixNeg);
var frequencyHyd = gethistogram(distMatrixHyd, weightMatrixHyd);

function gethistogram(data, weight) {
    var minValue = 0;
    var maxValue = 400;
    //var weights = [1, 5, 5, 2];
    var binset = getBitSet();

    var frequency = new Array(binset.length);
    for (var i = 0; i < binset.length; frequency[i++] = 0);

    for (var a = 0; a < data.length; a++) {
        var val = data[a];
        if (val < minValue) continue;
        if (val > maxValue) continue;

        for (var i = 0; i < frequency.length; i++) {
            frequency[i] += weight[a] * Math.exp(-((binset[i]-val)*(binset[i]-val)) / (2*(val*0.09)*(val*0.09)));
        }
    }
    return frequency;
}

var normalizedAll = normalize(frequencyAll, atomCount[0]);
var normalizedPos = setWeights(normalize(frequencyPos, atomCount[1]), 5);
var normalizedNeg = setWeights(normalize(frequencyNeg, atomCount[2]), 5);
var normalizedHyd = setWeights(normalize(frequencyHyd, atomCount[3]), 2);

var finalResult = normalizedAll.concat(normalizedPos, normalizedNeg, normalizedHyd);

for (var i = 0; i < finalResult.length; i++) {
    finalResult[i] = (finalResult[i] * 100) | 0;
}

function setWeights(array, factor) {
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

function GridBox(x, y, z) {
    this.xGrid = x;
    this.yGrid = y;
    this.zGrid = z;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.prop = [0, 0, 0, 0];
    this.atoms = [];
}

//fs.writeFileSync('./test.json', JSON.stringify(normArray, null, 2));
