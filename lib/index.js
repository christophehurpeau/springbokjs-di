"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});
var fs = require("springbokjs-utils/fs");

var Di = _interopRequire(require("./Di"));

exports.Di = Di;
var directory = function directory(di, paths) {
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    var singletons = [];
    return Promise.all(paths.map(function (path) {
        return fs.readRecursiveDirectory(path, { recursive: true }, function (file) {
            if (file.filename.slice(-3) !== ".js") {
                return;
            }
            var module = require(file.path);
            var name = file.filename.slice(0, -3);
            var values = di.addModule(name, module);
            Object.keys(values).forEach(function (key) {
                if (values[key].singleton) {
                    singletons.push(key);
                }
            });
        });
    })).then(function () {
        return di._instantiateSingletons(singletons);
    }).then(function () {
        return di;
    });
};
exports.directory = directory;
//# sourceMappingURL=index.js.map