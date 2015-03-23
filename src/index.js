var fs = require('springbokjs-utils/fs');
import Di from './Di';

export { Di };

export var directory = function(di, paths) {
    if (!Array.isArray(paths)) {
        paths = [ paths ];
    }
    var singletons = [];
    return Promise.all(paths.map((path) => {
        return fs.readRecursiveDirectory(path, { recursive: true }, (file) => {
            if (file.filename.slice(-3) !== '.js') {
                return;
            }
            var module = require(file.path);
            var name = file.filename.slice(0, -3);
            var values = di.addModule(name, module);
            Object.keys(values).forEach((key) => {
                if (values[key].singleton) {
                    singletons.push(key);
                }
            });
        });
    })).then(() => {
        return di._instantiateSingletons(singletons);
    }).then(() => di);
};
