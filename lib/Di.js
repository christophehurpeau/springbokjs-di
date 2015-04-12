'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
    value: true
});
var path = require('path');

var Di = (function () {
    function Di() {
        _classCallCheck(this, Di);

        this._classes = {};
        this._singletons = {};
        this._all = {};
        this._globals = { di: this };
    }

    _createClass(Di, [{
        key: 'addGlobal',
        value: function addGlobal(key, value) {
            this._globals[key] = value;
        }
    }, {
        key: 'add',
        value: function add(name, value) {
            this._add(name, value);
        }
    }, {
        key: 'addClass',
        value: function addClass(className, class_) {
            this._add(className, class_, true);
        }
    }, {
        key: 'get',
        value: function get(key) {
            return this[key];
        }
    }, {
        key: 'set',
        value: function set(key, value) {
            this._all[key] = this[key] = value;
        }
    }, {
        key: 'addModule',
        value: function addModule(name, module) {
            var _this = this;

            var value = module;

            if (module.dependencies && typeof module !== 'function') {
                throw new Error(name + ': dependencies in the module is deprecated');
            }

            if (module['default'] || typeof module === 'function') {
                value = typeof module === 'object' ? module['default'] : module;
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
                Object.keys(module).map(function (key) {
                    _this._add(key, module[key]);
                });
                return module;
            }
        }
    }, {
        key: 'addAll',
        value: function addAll(map) {
            var _this2 = this;

            Object.keys(map).forEach(function (name) {
                var key = (function (splitted) {
                    return splitted[splitted.length - 1];
                })(name.split('/'));
                _this2.addModule(key, map[name]);
            });
        }
    }, {
        key: 'resolveDependencies',
        value: function resolveDependencies(value) {
            var _internalCallCount = arguments[1] === undefined ? 0 : arguments[1];

            return this._resolveDependencies(value, value.constructor.dependencies, _internalCallCount);
        }
    }, {
        key: '_resolveDependencies',
        value: function _resolveDependencies(value, dependencies, _internalCallCount) {
            var _this3 = this;

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

            dependencies.forEach(function (dependency) {
                // console.log('='.repeat(_internalCallCount) + '> ' + 'Resolving dependency ' + dependency.key);
                Object.defineProperty(value, dependency.key, {
                    get: (function () {
                        var dependencyValue = this._all[dependency.name];
                        if (!dependencyValue) {
                            throw new Error(value.name + ': Failed to resolve dependency ' + dependency.name);
                        }

                        if (dependency.call || dependency.arguments) {
                            var instance = this.createInstanceOf(dependencyValue, dependency.arguments, _internalCallCount);
                            if (dependency.call) {
                                Object.keys(dependency.call).forEach(function (methodName) {
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
                    }).bind(_this3),
                    configurable: true,
                    enumerable: false
                });
            });
        }
    }, {
        key: '_add',
        value: function _add(name, value, isClass) {
            var _this4 = this;

            if (!value) {
                throw new Error('Trying to add a empty value in the di: ' + name);
            }
            if (this._all[name]) {
                console.warn('[warn] ' + name + ' is already defined');
            }
            this._all[name] = this[name] = value;
            var basename = path.basename(name);
            if (isClass || typeof value === 'function' && basename[0].toUpperCase() === basename[0]) {
                this._classes[name] = value;
                if (!value.displayName) {
                    value.displayName = name;
                }
                if (value.singleton) {
                    var key = name[0].toLowerCase() + name.substr(1);
                    var _arr = [this._singletons, this._all, this];
                    for (var _i = 0; _i < _arr.length; _i++) {
                        var thing = _arr[_i];
                        Object.defineProperty(thing, key, {
                            enumerable: true,
                            configurable: true,
                            get: function get() {
                                var instance = _this4.createInstanceOf(value);
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
    }, {
        key: 'createInstance',
        value: function createInstance(className, args) {
            var _internalCallCount = arguments[2] === undefined ? 0 : arguments[2];

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
    }, {
        key: 'createInstanceOf',
        value: function createInstanceOf(Class_, args) {
            var _this5 = this;

            var _internalCallCount = arguments[2] === undefined ? 0 : arguments[2];

            var instance = Object.create(Class_.prototype);
            // console.log('='.repeat(_internalCallCount) + '> ' + className, Class_, args, instance);
            Object.keys(this._globals).forEach(function (key) {
                Object.defineProperty(instance, key, {
                    enumerable: false,
                    writable: false,
                    configurable: true,
                    value: _this5._globals[key]
                });
            });
            if (Class_.dependencies) {
                this._resolveDependencies(instance, Class_.dependencies, _internalCallCount);
            }
            Class_.apply(instance, args);

            Object.defineProperty(instance, 'logger', {
                get: function get() {
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
    }], [{
        key: 'parseDependencies',
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
    }]);

    return Di;
})();

exports['default'] = Di;
module.exports = exports['default'];
//# sourceMappingURL=Di.js.map