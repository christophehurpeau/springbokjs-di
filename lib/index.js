'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _Di = require('./Di');

var _Di2 = _interopRequireWildcard(_Di);

var fs = require('springbokjs-utils/fs');
exports.Di = _Di2['default'];
var directory = function directory(di, paths) {
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    return Promise.all(paths.map(function (path) {
        return fs.readRecursiveDirectory(path, { recursive: true }, function (file) {
            if (file.filename.slice(-3) !== '.js') {
                return;
            }
            var module = require(file.path);
            var name = file.filename.slice(0, -3);
            di.addModule(name, module);
        });
    })).then(function () {
        return di;
    });
};
exports.directory = directory;
//# sourceMappingURL=index.js.map