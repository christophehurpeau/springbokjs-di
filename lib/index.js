"use strict";
var fs = require('springbokjs-utils/fs');
exports.Di = require('./Di').Di;

exports.directory = function(di, paths) {
    if (!Array.isArray(paths)) {
        paths = [ paths ];
    }
    var objects = [];
    return Promise.all(paths.map(function(path) {
        return fs.readRecursiveDirectory(path, { recursive: true }, function(file) {
            if (file.filename.slice(-3) !== '.js') {
                return;
            }
            var module = require(file.path);
            var name = file.filename.slice(0, -3);
            var value = di._addModule(name, module);
            value._DI_NAME = name;
            if (!di._classes[name]) {
                objects.push(value);
            }
        });
    })).then(function() {
        return di._resolveDependenciesForObjects(objects, 0);
    }).then(function() {
        return Promise.all(objects.map(function(object) {
            try {
                return object.initialize && object.initialize();
            } catch (e) {
                var failed = new Error('Failed to initialize ' + object._DI_NAME);
                failed.previous = e;
                throw failed;
            }
        }));
    }).then(function() {
      return di;
    });
};

//# sourceMappingURL=index.js.map