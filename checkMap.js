'use strict';

const fs = require('fs');
const assert = require('assert');

try {
    let map = JSON.parse(fs.readFileSync('./java/output.json', 'utf8'));
    assert(typeof map === 'object' && !(map instanceof Array), 'Map must be an object');
} catch (e) {
    console.log('Map not OK');
    console.log(e.stack);
    process.exit(1);
}

console.log('Map OK');
