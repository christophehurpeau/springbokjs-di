"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var path = require("path");

var Di = (function () {
    function Di() {
        _classCallCheck(this, Di);

        this._classes = {};
        this._singletons = {};
        this._all = {};
        this._globals = { di: this };
    }

    _createClass(Di, {
        addGlobal: {
            value: function addGlobal(key, value) {
                this._globals[key] = value;
            }
        },
        add: {
            value: function add(name, value) {
                this._add(name, value);
                return Promise.resolve();
            }
        },
        addClass: {
            value: function addClass(className, class_) {
                var _this = this;

                this._add(className, class_, true);
                if (class_.singleton) {
                    return this.createInstance(className).then(function (instance) {
                        var key = className[0].toLowerCase() + className.substr(1);
                        _this._singletons[key] = _this._all[key] = _this[key] = instance;
                    });
                }
                return Promise.resolve();
            }
        },
        get: {
            value: function get(key) {
                return this[key];
            }
        },
        set: {
            value: function set(key, value) {
                this._all[key] = this[key] = value;
            }
        },
        addModule: {
            value: function addModule(name, module) {
                var _this = this;

                var value = module;

                if (module.dependencies && typeof module !== "function") {
                    throw new Error(name + ": dependencies in the module is deprecated");
                }

                if (module["default"] || typeof module === "function") {
                    value = typeof module === "object" ? module["default"] : module;
                    if (module.dependencies) {
                        Object.defineProperty(value, "dependencies", {
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
                    Object.keys(module).map(function (key) {
                        _this._add(key, module[key]);
                    });
                    return module;
                }
            }
        },
        addAll: {
            value: function addAll(map) {
                var _this = this;

                var singletons = [];
                Object.keys(map).forEach(function (name) {
                    var key = (function (splitted) {
                        return splitted[splitted.length - 1];
                    })(name.split("/"));
                    var values = _this.addModule(key, map[name]);
                    Object.keys(values).forEach(function (key) {
                        if (values[key].singleton) {
                            singletons.push(key);
                        }
                    });
                });

                return this._instantiateSingletons(singletons);
            }
        },
        _instantiateSingletons: {
            value: function _instantiateSingletons(singletons) {
                var _this = this;

                var promises = singletons.map(function (className) {
                    var key = className[0].toLowerCase() + className.substr(1);
                    if (!_this._classes[className]) {
                        throw new Error("Class " + className + " not found in the di");
                    }
                    var instance = Object.create(_this._classes[className].prototype);
                    _this._singletons[key] = _this._all[key] = _this[key] = instance;
                    Object.keys(_this._globals).forEach(function (key) {
                        Object.defineProperty(instance, key, {
                            enumerable: false,
                            writable: false,
                            configurable: true,
                            value: _this._globals[key]
                        });
                    });
                    return instance;
                }).map(function (instance) {
                    return _this.resolveDependencies(instance, 0).then(function () {
                        if (instance.initialize) {
                            console.log(instance.constructor.name + " initialize method is deprecated");
                            return instance.initialize().then(function () {
                                return instance;
                            });
                        }
                        return instance;
                    });
                });
                return Promise.all(promises).then(function (instances) {
                    instances.map(function (instance) {
                        instance.constructor.call(instance);
                        return instance;
                    });
                });
            }
        },
        resolveDependencies: {
            value: function resolveDependencies(value) {
                var _internalCallCount = arguments[1] === undefined ? 0 : arguments[1];

                return this._resolveDependencies(value, value.constructor.dependencies, _internalCallCount);
            }
        },
        _resolveDependencies: {
            value: function _resolveDependencies(value, dependencies, _internalCallCount) {
                var _this = this;

                if (!dependencies) {
                    return Promise.resolve();
                }
                if (_internalCallCount > 20) {
                    throw new Error("Called more than 20 times _resolveDependencies");
                }
                var promises = [];

                dependencies.forEach(function (dependency) {
                    // console.log('='.repeat(_internalCallCount) + '> ' + 'Resolving dependency ' + dependency.key);
                    if (dependency.call || dependency.arguments) {
                        promises.push(_this.createInstance(dependency.name, dependency.arguments, _internalCallCount).then(function (instance) {
                            value[dependency.key] = instance;
                            if (dependency.call) {
                                Object.keys(dependency.call).forEach(function (methodName) {
                                    if (!instance[methodName]) {
                                        throw new Error("Cannot call " + methodName + " in class " + dependency.key);
                                    }
                                    instance[methodName].apply(instance, dependency.call[methodName]);
                                });
                            }
                        }));
                    } else {
                        if (!_this._all[dependency.name]) {
                            throw new Error(value.name + ": Failed to resolve dependency " + dependency.name);
                        }
                        value[dependency.key] = _this._all[dependency.name];
                    }
                });

                return Promise.all(promises);
            }
        },
        _add: {
            value: function _add(name, value, isClass) {
                if (!value) {
                    throw new Error("Trying to add a empty value in the di: " + name);
                }
                if (this._all[name]) {
                    console.warn("[warn] " + name + " is already defined");
                }
                this._all[name] = this[name] = value;
                var basename = path.basename(name);
                if (isClass || typeof value === "function" && basename[0].toUpperCase() === basename[0]) {
                    this._classes[name] = value;
                    if (!value.displayName) {
                        value.displayName = name;
                    }
                    if (!value.prototype.resolveDependencies) {
                        var di = this;
                        value.prototype.resolveDependencies = function () {
                            var _internalCallCount = arguments[0] === undefined ? 0 : arguments[0];

                            console.log("deprecated, use di.resolveDependencies(value)");
                            console.trace();
                            this.resolveDependencies = function () {};
                            if (value.dependencies) {
                                try {
                                    return di._resolveDependencies(this, value.dependencies, _internalCallCount + 1);
                                } catch (err) {
                                    throw new Error("Failed to resolve dependencies for instance of " + name + ": " + err.message);
                                }
                            }
                        };
                    }
                }
                if (value.dependencies) {
                    Object.defineProperty(value, "dependencies", {
                        configurable: true,
                        writable: false,
                        enumerable: false,
                        value: this.constructor.parseDependencies(value.dependencies)
                    });
                }
            }
        },
        createInstance: {
            value: function createInstance(className, args) {
                var _internalCallCount = arguments[2] === undefined ? 0 : arguments[2];

                // console.log('='.repeat(_internalCallCount) + '> ' + 'Creating instance of ' + className);
                if (!className) {
                    throw new Error("Unexpected value for className");
                }
                var Class_ = this._classes[className];
                if (!Class_) {
                    throw new Error("Class " + className + " not found");
                }
                return this.createInstanceOf(Class_, args, _internalCallCount);
            }
        },
        createInstanceOf: {
            value: function createInstanceOf(Class_, args) {
                var _this = this;

                var _internalCallCount = arguments[2] === undefined ? 0 : arguments[2];

                var instance;
                instance = Object.create(Class_.prototype);
                // console.log('='.repeat(_internalCallCount) + '> ' + className, Class_, args, instance);
                Object.keys(this._globals).forEach(function (key) {
                    Object.defineProperty(instance, key, {
                        enumerable: false,
                        writable: false,
                        configurable: true,
                        value: _this._globals[key]
                    });
                });
                if (Class_.dependencies) {
                    return this._resolveDependencies(instance, Class_.dependencies, _internalCallCount).then(function () {
                        if (instance.initialize) {
                            console.log(Class_.constructor.displayName + " initialize method is deprecated");
                            instance.initialize();
                        }
                    }).then(function () {
                        return instance;
                    });
                }
                Class_.apply(instance, args);
                if (instance.initialize) {
                    console.log(Class_.constructor.displayName + " initialize method is deprecated");
                    return instance.initialize().then(function () {
                        return instance;
                    });
                }

                Object.defineProperty(instance, "logger", {
                    get: function get() {
                        var logger = this._createLogger(Class_.name);
                        Object.defineProperty(instance, "logger", {
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
    }, {
        parseDependencies: {
            value: function parseDependencies(dependencies) {
                return (function () {
                    if (Array.isArray(dependencies)) {
                        return dependencies.map(function (v) {
                            return {
                                key: v,
                                name: v
                            };
                        });
                    } else {
                        return Object.keys(dependencies).map(function (key) {
                            var dependency = dependencies[key];
                            if (typeof dependency === "string") {
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
        }
    });

    return Di;
})();

module.exports = Di;

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
//# sourceMappingURL=Di.js.map