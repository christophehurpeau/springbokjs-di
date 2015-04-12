var fs = require('springbokjs-utils/fs');
import Di from './Di';

export { Di };

export var directory = function(di, paths) {
    if (!Array.isArray(paths)) {
        paths = [ paths ];
    }
    return Promise.all(paths.map((path) => {
        return fs.readRecursiveDirectory(path, { recursive: true }, (file) => {
            if (file.filename.slice(-3) !== '.js') {
                return;
            }
            var module = require(file.path);
            var name = file.filename.slice(0, -3);
            di.addModule(name, module);
        });
    })).then(() => di);
};
