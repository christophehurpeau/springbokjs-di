var path = require('path');

export default class Di {
    constructor() {
        this._classes = {};
        this._singletons = {};
        this._all = {};
        this._globals = { di: this };
    }

    addGlobal(key, value) {
        this._globals[key] = value;
    }

    add(name, value) {
        this._add(name, value);
        return Promise.resolve();
    }

    addClass(className, class_) {
        this._add(className, class_, true);
        if (class_.singleton) {
            return this.createInstance(className).then((instance) => {
                var key = className[0].toLowerCase() + className.substr(1);
                this._singletons[key] = this._all[key] = this[key] = instance;
            });
        }
        return Promise.resolve();
    }

    get(key) {
        return this[key];
    }

    set(key, value) {
        this._all[key] = this[key] = value;
    }

    addModule(name, module) {
        var value = module;

        if (module.dependencies && typeof module !== 'function') {
            throw new Error(name + ': dependencies in the module is deprecated');
        }

        if (module.default || typeof module === 'function') {
            value = typeof module === 'object' ? module.default : module;
            if (module.dependencies) {
                Object.defineProperty(value, 'dependencies', {
                    configurable: true,
                    writable: false,
                    enumerable: false,
                    value: module.dependencies
                });
            }
            this._add(name, value);
            var result = {};
            result[name] = value;
            return result;
            // return { [name]: value };
        } else {
            Object.keys(module).map((key) => {
                this._add(key, module[key]);
            });
            return module;
        }
    }

    addAll(map) {
        var singletons = [];
        Object.keys(map).forEach((name) => {
            var key = (function(splitted) { return splitted[splitted.length - 1]; })(name.split('/'))    ;
            var values = this.addModule(key, map[name]);
            Object.keys(values).forEach((key) => {
                if (values[key].singleton) {
                    singletons.push(key);
                }
            });
        });

        return this._instantiateSingletons(singletons);
    }

    _instantiateSingletons(singletons) {
        var promises = singletons.map((className) => {
            var key = className[0].toLowerCase() + className.substr(1);
            if (!this._classes[className]) {
                throw new Error('Class ' + className + ' not found in the di');
            }
            var instance = Object.create(this._classes[className].prototype);
            this._singletons[key] = this._all[key] = this[key] = instance;
            Object.keys(this._globals).forEach((key) => {
                Object.defineProperty(instance, key, {
                    enumerable: false,
                    writable: false,
                    configurable: true,
                    value: this._globals[key]
                });
            });
            return instance;
        }).map((instance) => {
            return this.resolveDependencies(instance, 0).then(() => {
                if (instance.initialize) {
                    console.log(instance.constructor.name + ' initialize method is deprecated');
                    return instance.initialize().then(() => instance);
                }
                return instance;
            });
        });
        return Promise.all(promises).then((instances) => {
            instances.map((instance) => {
                instance.constructor.call(instance);
                return instance;
            });
        });
    }

    resolveDependencies(value, _internalCallCount = 0) {
        return this._resolveDependencies(value, value.constructor.dependencies, _internalCallCount);
    }

    _resolveDependencies(value, dependencies, _internalCallCount) {
        if (!dependencies) {
            return Promise.resolve();
        }
        if (_internalCallCount > 20) {
            throw new Error('Called more than 20 times _resolveDependencies');
        }
        var promises = [];

        dependencies.forEach((dependency) => {
            // console.log('='.repeat(_internalCallCount) + '> ' + 'Resolving dependency ' + dependency.key);
            if (dependency.call || dependency.arguments) {
                promises.push(
                    this.createInstance(dependency.name, dependency.arguments, _internalCallCount).then((instance) => {
                        value[dependency.key] = instance;
                        if (dependency.call) {
                            Object.keys(dependency.call).forEach((methodName) => {
                                if (!instance[methodName]) {
                                    throw new Error('Cannot call ' + methodName + ' in class ' + dependency.key);
                                }
                                instance[methodName].apply(instance, dependency.call[methodName]);
                            });
                        }
                    })
                );
            } else {
                if (!this._all[dependency.name]) {
                    throw new Error(value.name + ': Failed to resolve dependency ' + dependency.name);
                }
                value[dependency.key] = this._all[dependency.name];
            }
        });

        return Promise.all(promises);
    }

    _add(name, value, isClass) {
        if (!value) {
            throw new Error('Trying to add a empty value in the di: ' + name);
        }
        if (this._all[name]) {
            console.warn('[warn] ' + name + ' is already defined');
        }
        this._all[name] = this[name] = value;
        var basename = path.basename(name);
        if (isClass || (typeof value === 'function' && basename[0].toUpperCase() === basename[0])) {
            this._classes[name] = value;
            if (!value.displayName) {
                value.displayName = name;
            }
            if (!value.prototype.resolveDependencies) {
                var di = this;
                value.prototype.resolveDependencies = function(_internalCallCount = 0) {
                    console.log('deprecated, use di.resolveDependencies(value)');
                    console.trace();
                    this.resolveDependencies = function() {};
                    if (value.dependencies) {
                        try {
                            return di._resolveDependencies(this, value.dependencies, _internalCallCount + 1);
                        } catch (err) {
                            throw new Error('Failed to resolve dependencies for instance of ' +
                                            name + ': ' + err.message);
                        }
                    }
                };
            }
        }
        if (value.dependencies) {
            Object.defineProperty(value, 'dependencies', {
                configurable: true,
                writable: false,
                enumerable: false,
                value: this.constructor.parseDependencies(value.dependencies)
            });
        }
    }

    static parseDependencies(dependencies) {
        return (function() {
            if (Array.isArray(dependencies)) {
                return dependencies.map((v) => {
                    return {
                        key: v,
                        name: v
                    };
                });
            } else {
                return Object.keys(dependencies).map((key) => {
                    var dependency = dependencies[key];
                    if (typeof dependency === 'string') {
                        dependency = { name: dependency };
                    }
                    dependency.key = key;

                    if (!dependency.name) {
                        dependency.name = key;
                        if (dependency.arguments || dependency.call) {
                            dependency.key = key[0].toLowerCase() + key.substr(1);
                        }
                    }
                    return dependency;
                });
            }
        })().filter(Boolean);
    }

    createInstance(className, args, _internalCallCount = 0) {
        // console.log('='.repeat(_internalCallCount) + '> ' + 'Creating instance of ' + className);
        if (!className) {
            throw new Error('Unexpected value for className');
        }
        var Class_ = this._classes[className];
        if (!Class_) {
            throw new Error('Class ' + className + ' not found');
        }
        return this.createInstanceOf(Class_, args, _internalCallCount);
    }

    createInstanceOf(Class_, args, _internalCallCount = 0) {
        var instance;
        instance = Object.create(Class_.prototype);
        // console.log('='.repeat(_internalCallCount) + '> ' + className, Class_, args, instance);
        Object.keys(this._globals).forEach((key) => {
            Object.defineProperty(instance, key, {
                enumerable: false,
                writable: false,
                configurable: true,
                value: this._globals[key]
            });
        });
        if (Class_.dependencies) {
            return this._resolveDependencies(instance, Class_.dependencies, _internalCallCount)
                .then(() => {
                    if (instance.initialize) {
                        console.log(Class_.constructor.displayName + ' initialize method is deprecated');
                        instance.initialize();
                    }
                })
                .then(() => instance);
        }
        Class_.apply(instance, args);
        if (instance.initialize) {
            console.log(Class_.constructor.displayName + ' initialize method is deprecated');
            return instance.initialize().then(() => instance);
        }

        Object.defineProperty(instance, 'logger', {
            get: function() {
                var logger = this._createLogger(Class_.name);
                Object.defineProperty(instance, 'logger', {
                    writable: false,
                    configurable: false,
                    value: logger
                });
                return logger;

            }
        });

        return Promise.resolve(instance);
    }
}

/*
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
});*/
