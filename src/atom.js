'use strict';

var Kind = require('./kind');

function Atom(type, residue, coordinates) {
    this.type = type;
    this.residue = residue;
    this.kind = Kind.lookup(type, residue);
    this.coordinates = coordinates;
}

module.exports = Atom;
