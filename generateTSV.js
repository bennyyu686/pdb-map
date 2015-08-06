'use strict';

var fs = require('fs');
var gzip = require('zlib');
var glob = require('glob');
var path = require('path');
var async = require('async');
var ProgressBar = require('progress');
var program = require('commander');

var parse = require('./src/parser');
var getFingerprint = require('./src/fingerprint');

var config;
try {
    config = require('./config.json');
} catch(e) {
    config = require('./config.default.json');
}

program
    .option('-p, --progress', 'Show progression')
    .option('-n, --use-name', 'Use filename (XXXX pdbs)')
    .option('-o, --out [file]', 'Output in a file')
    .option('-u, --update', 'Update fingerprints')
    .parse(process.argv);

glob('**/*.pdb1.gz', {
    cwd: config.data
}, function (err, files) {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    var out;
    if (program.update) {
        if (!program.out) {
            throw new Error('out file parameter is mandatory for update run');
        }
        if (!config.rsyncHistory) {
            throw new Error('missing rsyncHistory config value');
        }

        // We assume that the files are ordered by timestamp.
        // There will be a problem when the timestamp has one more digit (Sat Nov 20 2286 18:46:40 GMT+0100)
        var historyFiles = glob('*.json', {
            cwd: config.rsyncHistory,
            sync: true
        }).map(function (file) {
            return path.resolve(config.rsyncHistory, file);
        });

        // Read last fingerprint file and create a Map with PDB id as the key
        var currentOut = fs.readFileSync(program.out, 'utf8').split(/[\r\n]+/);
        var map = new Map();
        currentOut.forEach(function (out) {
            if (out.length > 0) map.set(out.substr(0, 4), out);
        });
        var todo = new Set();

        // For each history file, if there is a deleted PDB, we remove it from the map and todolist
        // If there is an updated PDB, it is added to the todolist
        var somethingChanged = false;
        for (var i = 0; i < historyFiles.length; i++) {
            var historyFile = require(historyFiles[i]);
            for (let j = 0; j < historyFile.deleted.length; j++) {
                somethingChanged = true;
                map.delete(historyFile.deleted[j]);
                todo.delete(historyFile.deleted[j]);
            }
            for (let j = 0; j < historyFile.updated.length; j++) {
                somethingChanged = true;
                map.delete(historyFile.updated[j]);
                todo.add(historyFile.updated[j]);
            }
        }

        if (!somethingChanged) {
            // Nothing has changed, stop now
            console.log('No changes, aborting update');
            cleanUpdate();
            process.exit(1);
        }

        // Now that the map has been filtered, write the existing PDBs
        out = fs.createWriteStream(program.out + '.tmp');
        for (let line of map.values()) {
            out.write(line + '\n');
        }
        map.clear();

        // From the globbed files, extract the ones that we need to read
        var oldfiles = files;
        files = [];
        for (let entry of todo.values()) {
            for (let file of oldfiles) {
                if (file.toUpperCase().includes(entry)) {
                    files.push(file);
                }
            }
        }

    } else if (program.out) {
        out = fs.createWriteStream(program.out);
    } else {
        out = process.stdout;
    }

    if (program.progress) {
        var bar = new ProgressBar('  generating fingerprints [:bar] (:current/:total) :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: files.length
        });
    }

    async.eachSeries(files, treatFile, function (err) {
        if (err) console.error(err);
        if (program.out) {
            out.end();
        }
        if (program.update) {
            cleanUpdate();
        }
    });

    function treatFile(file, cb) {
        fs.readFile(path.join(config.data, file), function (err, data) {
            if (err) return cb(err);
            var fileName = path.parse(file).name;
            try {
                var contents = gzip.gunzipSync(data).toString();
                if (program.useName) {
                    contents = contents.replace(/^(.*)XXXX(.*)/, '$1' + fileName.toUpperCase() + '$2');
                }
                var protein = parse(contents);
                if (protein.experiment.indexOf('DIFFRACTION') > 0) {
                    var fingerprint = getFingerprint(protein.atoms);
                    out.write(protein.idCode + '\t' + fingerprint.join('\t') + '\n');
                }
                if (program.progress) bar.tick();
            } catch (e) {
                process.stderr.write('unzip failed: ' + file + '\n');
            }
            cb();
        });
    }

    function cleanUpdate() {
        fs.unlinkSync(program.out);
        fs.renameSync(program.out + '.tmp', program.out);
        historyFiles.forEach(function (file) {
            fs.unlinkSync(file);
        });
    }
});
