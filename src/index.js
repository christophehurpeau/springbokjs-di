var fs = require('springbokjs-utils/fs');

export class Di {
    constructor() {
        this._classes = {};
    }

    _forEachDependencies(dependencies, callback) {
        if (Array.isArray(dependencies)) {
            dependencies.forEach((key) => callback(key, key));
        } else {
            Object.keys(dependencies).forEach((key) => callback(key, dependencies[key]));
        }
    }

    directory(paths) {
        if (!Array.isArray(paths)) {
            paths = [ paths ];
        }
        var singletons = [];
        return Promise.all(paths.map((path) => {
            return fs.readRecursiveDirectory(path, { recursive: true }, (file) => {
                if (file.filename.slice(-3) !== '.js') {
                    return;
                }
                var className = file.filename.slice(0, -3);
                var module = require(file.path);
                this._classes[className] = this[className] = module[className];
                if (module.dependencies) {
                    module[className].dependencies = module.dependencies;
                }
                if (module.singleton || module[className].singleton) {
                    singletons.push(className);
                }
            });
        })).then(() => {
            var countMissingDependencies = (dependencies) => {
                if (!dependencies) {
                    return 0;
                }
                if (Array.isArray(dependencies)) {
                    return dependencies.filter((key) => this[dependencies[key]] === undefined).length;
                } else {
                    return Object.keys(dependencies).filter((key) => this[dependencies[key]] === undefined).length;
                }
            };

            var sort = () => {
                singletons = singletons.sort((a, b) => {
                    return countMissingDependencies(this._classes[a].dependencies)
                             - countMissingDependencies(this._classes[b].dependencies);
                });
            };
            var i = 0, promises = [];
            do {
                var className = singletons.shift(), Singleton = this._classes[className];
                if (countMissingDependencies(Singleton.dependencies) !== 0) {
                    singletons.push(className);
                    sort();
                } else {
                    var instance = this.createInstance(className);
                    var promise = instance.initialize && instance.initialize();
                    if (promise) {
                        promises.push(promise);
                    }
                    this[className[0].toLowerCase() + className.substr(1)] = instance;
                }

            } while (singletons.length !== 0 && i++ < 10);

            if (singletons.length !== 0) {
                throw new Error('Failed to load dependencies (circular ?)');
            }
            return Promise.all(promises);
        }).then(() => this);
    }

    addClass(className, class_) {
        this._classes[className] = this[className] = class_;
        if (class_.singleton) {
            return this.getInitializedInstance(className);
        }
    }

    get(key) {
        return this[key];
    }

    createInstance(className, args) {
        if (!className) {
            throw new Error('Unexpected value for className');
        }
        var instance, Class_ = this._classes[className];
        if (args) {
            instance = Object.create(Class_.prototype);
            Class_.apply(instance, args);
            // or instance = new (Class_.bind.apply(Class_, args))();
        } else {
            instance = new Class_();
        }
        instance.di = this;
        if (Class_.dependencies) {
            this._forEachDependencies(Class_.dependencies, (key, dependency) => {
                if (typeof dependency === 'string') {
                    instance[key] = this[dependency];
                } else if (dependency.name) {
                    instance[key] = this[dependency.name];
                } else {
                    instance[key] = this.createInstance(dependency.className, dependency.arguments);
                }
                if (!instance[key]) {
                    throw new Error('Unable to resolve dependency ' + JSON.stringify(dependency)
                                                             + ' for class ' + className);
                }
            });
        }
        return instance;
    }

    getInitializedInstance(className) {
        var instance = this.createInstance(className);
        return Promise.resolve(instance.initialize && instance.initialize()).then(() => instance);
    }
}
