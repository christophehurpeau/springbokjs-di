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
    }

    addClass(className, class_) {
        this._add(className, class_, true);
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
        Object.keys(map).forEach((name) => {
            var key = (function(splitted) { return splitted[splitted.length - 1]; })(name.split('/'))    ;
            this.addModule(key, map[name]);
        });
    }

    resolveDependencies(value, _internalCallCount = 0) {
        return this._resolveDependencies(value, value.constructor.dependencies, _internalCallCount);
    }

    _resolveDependencies(value, dependencies, _internalCallCount) {
        if (!dependencies) {
            return;
        }
        if (_internalCallCount > 20) {
            throw new Error('Called more than 20 times _resolveDependencies');
        }

        if (!dependencies.forEach) {
            console.log(dependencies);
            throw new Error('Invalid dependencies value');
        }

        dependencies.forEach((dependency) => {
            // console.log('='.repeat(_internalCallCount) + '> ' + 'Resolving dependency ' + dependency.key);
            Object.defineProperty(value, dependency.key, {
                get: function() {
                    var dependencyValue = this._all[dependency.name];
                    if (!dependencyValue) {
                        throw new Error(value.name + ': Failed to resolve dependency ' + dependency.name);
                    }

                    if (dependency.call || dependency.arguments) {
                        var instance = this.createInstanceOf(dependencyValue, dependency.arguments, _internalCallCount);
                        if (dependency.call) {
                            Object.keys(dependency.call).forEach((methodName) => {
                                if (!instance[methodName]) {
                                    throw new Error('Cannot call ' + methodName + ' in class ' + dependency.key);
                                }
                                instance[methodName].apply(instance, dependency.call[methodName]);
                            });
                        }
                        dependencyValue = instance;
                    }

                    Object.defineProperty(value, dependency.key, {
                        value: dependencyValue,
                        writable: false,
                        configurable: false,
                        enumerable: false
                    });
                    return dependencyValue;
                }.bind(this),
                configurable: true,
                enumerable: false
            });
        });
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
            if (value.singleton) {
                var key = name[0].toLowerCase() + name.substr(1);
                for (var thing of [this._singletons, this._all, this]) {
                    Object.defineProperty(thing, key, {
                        enumerable: true,
                        configurable: true,
                        get: () => {
                            var instance = this.createInstanceOf(value);
                            Object.defineProperty(thing, key, {
                                enumerable: true,
                                configurable: true,
                                wriable: false,
                                value: instance
                            });
                            return instance;
                        }
                    });
                }
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
        var instance = Object.create(Class_.prototype);
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
            this._resolveDependencies(instance, Class_.dependencies, _internalCallCount);
        }
        Class_.apply(instance, args);

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

        return instance;
    }
}
