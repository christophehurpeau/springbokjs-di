"use strict";
var fs = require('springbokjs-utils/fs');

var Di = function() {
  var Di = function Di() {
      this._classes = {};
  };

  Object.defineProperties(Di.prototype, {
    _forEachDependencies: {
      writable: true,

      value: function(dependencies, callback) {
          if (Array.isArray(dependencies)) {
              dependencies.forEach(function(key) {
                return callback(key, key);
              });
          } else {
              Object.keys(dependencies).forEach(function(key) {
                return callback(key, dependencies[key]);
              });
          }
      }
    },

    directory: {
      writable: true,

      value: function(paths) {
        var _this = this;
        if (!Array.isArray(paths)) {
            paths = [ paths ];
        }
        var singletons = [];
        return Promise.all(paths.map(function(path) {
            return fs.readRecursiveDirectory(path, { recursive: true }, function(file) {
                if (file.filename.slice(-3) !== '.js') {
                    return;
                }
                var className = file.filename.slice(0, -3);
                var module = require(file.path);
                _this._classes[className] = _this[className] = module[className];
                if (module.dependencies) {
                    module[className].dependencies = module.dependencies;
                }
                if (module.singleton || module[className].singleton) {
                    singletons.push(className);
                }
            });
        })).then(function() {
            var countMissingDependencies = function(dependencies) {
                if (!dependencies) {
                    return 0;
                }
                if (Array.isArray(dependencies)) {
                    return dependencies.filter(function(key) {
                      return _this[dependencies[key]] === undefined;
                    }).length;
                } else {
                    return Object.keys(dependencies).filter(function(key) {
                      return _this[dependencies[key]] === undefined;
                    }).length;
                }
            };

            var sort = function() {
                singletons = singletons.sort(function(a, b) {
                    return countMissingDependencies(_this._classes[a].dependencies)
                             - countMissingDependencies(_this._classes[b].dependencies);
                });
            };
            var i = 0, promises = [];
            do {
                var className = singletons.shift(), Singleton = _this._classes[className];
                if (countMissingDependencies(Singleton.dependencies) !== 0) {
                    singletons.push(className);
                    sort();
                } else {
                    var instance = _this.createInstance(className);
                    var promise = instance.initialize && instance.initialize();
                    if (promise) {
                        promises.push(promise);
                    }
                    _this[className[0].toLowerCase() + className.substr(1)] = instance;
                }

            } while (singletons.length !== 0 && i++ < 10);

            if (singletons.length !== 0) {
                throw new Error('Failed to load dependencies (circular ?)');
            }
            return Promise.all(promises);
        }).then(function() {
          return _this;
        });
      }
    },

    addClass: {
      writable: true,

      value: function(className, class_) {
          this._classes[className] = this[className] = class_;
          if (class_.singleton) {
              return this.getInitializedInstance(className);
          }
      }
    },

    get: {
      writable: true,

      value: function(key) {
          return this[key];
      }
    },

    createInstance: {
      writable: true,

      value: function(className, args) {
        var _this2 = this;
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
            this._forEachDependencies(Class_.dependencies, function(key, dependency) {
                if (typeof dependency === 'string') {
                    instance[key] = _this2[dependency];
                } else if (dependency.name) {
                    instance[key] = _this2[dependency.name];
                } else {
                    instance[key] = _this2.createInstance(dependency.className, dependency.arguments);
                }
                if (!instance[key]) {
                    throw new Error('Unable to resolve dependency ' + JSON.stringify(dependency)
                                                             + ' for class ' + className);
                }
            });
        }
        return instance;
      }
    },

    getInitializedInstance: {
      writable: true,

      value: function(className) {
          var instance = this.createInstance(className);
          return Promise.resolve(instance.initialize && instance.initialize()).then(function() {
            return instance;
          });
      }
    }
  });

  return Di;
}();

exports.Di = Di;

//# sourceMappingURL=index.js.map