"use strict";

var path = require("path");
var Di = (function () {
  var Di = function Di() {
    this._classes = {};
    this._singletons = {};
    this._all = {};
    this._globals = { di: this };
  };

  Di.prototype.addGlobal = function (key, value) {
    this._globals[key] = value;
  };

  Di.prototype.add = function (name, value) {
    this._add(name, value);
    return Promise.resolve();
  };

  Di.prototype.addClass = function (className, class_) {
    var _this = this;
    this._add(className, class_, true);
    if (class_.singleton) {
      return this.createInstance(className).then(function (instance) {
        var key = className[0].toLowerCase() + className.substr(1);
        _this._singletons[key] = _this._all[key] = _this[key] = instance;
      });
    }
    return Promise.resolve();
  };

  Di.prototype.get = function (key) {
    return this[key];
  };

  Di.prototype.set = function (key, value) {
    this._all[key] = this[key] = value;
  };

  Di.prototype.addModule = function (name, module) {
    var _this2 = this;
    var value = module;

    if (typeof module !== "object") {
      throw new Error(name + ": should be a library and not a function");
    }

    if (module.dependencies) {
      console.log("[warn] " + name + ": dependencies in the module is deprecated");
    }

    if (module["default"]) {
      console.log("[warn] " + name + ": default is deprecated");
      value = module["default"];
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
        _this2._add(key, module[key]);
      });
      return module;
    }
  };

  Di.prototype.addAll = function (map) {
    var _this3 = this;
    var singletons = [];
    Object.keys(map).forEach(function (name) {
      var values = _this3.addModule(name, map[name]);
      Object.keys(values).forEach(function (key) {
        if (values[key].singleton) {
          singletons.push(key);
        }
      });
    });

    return this._instantiateSingletons(singletons);
  };

  Di.prototype._instantiateSingletons = function (singletons) {
    var _this4 = this;
    var promises = singletons.map(function (className) {
      var key = className[0].toLowerCase() + className.substr(1);
      if (!_this4._classes[className]) {
        throw new Error("Class " + className + " not found in the di");
      }
      var instance = Object.create(_this4._classes[className].prototype);
      _this4._singletons[key] = _this4._all[key] = _this4[key] = instance;
      return instance;
    }).map(function (instance) {
      return _this4.resolveDependencies(instance, 0).then(function () {
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
  };

  Di.prototype.resolveDependencies = function (value, _internalCallCount) {
    if (_internalCallCount === undefined) _internalCallCount = 0;
    return this._resolveDependencies(value, value.constructor.dependencies, _internalCallCount);
  };

  Di.prototype._resolveDependencies = function (value, dependencies, _internalCallCount) {
    var _this5 = this;
    if (!dependencies) {
      return Promise.resolve();
    }
    if (_internalCallCount > 20) {
      throw new Error("Called more than 20 times _resolveDependencies");
    }
    var promises = [];

    dependencies.forEach(function (dependency) {
      //console.log('='.repeat(_internalCallCount) + '> ' + 'Resolving dependency ' + dependency.key);
      if (dependency.call || dependency.arguments) {
        promises.push(_this5.createInstance(dependency.name, dependency.arguments, _internalCallCount).then(function (instance) {
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
        if (!_this5._all[dependency.name]) {
          throw new Error("Failed to resolve dependency " + dependency.name);
        }
        value[dependency.key] = _this5._all[dependency.name];
      }
    });

    return Promise.all(promises);
  };

  Di.prototype._add = function (name, value, isClass) {
    if (!value) {
      throw new Error("Trying to add a empty value in the di: " + name);
    }
    if (this._all[name]) {
      console.warn("[warn] " + name + " is already defined");
    }
    this._all[name] = this[name] = value;
    var basename = path.basename(name);
    if (isClass || (typeof value === "function" && basename[0].toUpperCase() === basename[0])) {
      this._classes[name] = value;
      if (!value.displayName) {
        value.displayName = name;
      }
      if (!value.prototype.resolveDependencies) {
        console.log("deprecated, use di.resolveDependencies(value)");
        var di = this;
        value.prototype.resolveDependencies = function (_internalCallCount) {
          if (_internalCallCount === undefined) _internalCallCount = 0;
          this.resolveDependencies = function () {};
          if (value.dependencies) {
            try {
              return di._resolveDependencies(this, value.dependencies, _internalCallCount + 1);
            } catch (err) {
              throw new Error("Failed to resolve dependencies for instance of  " + name + ": " + err.message);
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
  };

  Di.parseDependencies = function (dependencies) {
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
  };

  Di.prototype.createInstance = function (className, args, _internalCallCount) {
    if (_internalCallCount === undefined) _internalCallCount = 0;
    //console.log('='.repeat(_internalCallCount) + '> ' + 'Creating instance of ' + className);
    if (!className) {
      throw new Error("Unexpected value for className");
    }
    var Class_ = this._classes[className];
    if (!Class_) {
      throw new Error("Class " + className + " not found");
    }
    return this.createInstanceOf(Class_, args, _internalCallCount);
  };

  Di.prototype.createInstanceOf = function (Class_, args, _internalCallCount) {
    var _this6 = this;
    if (_internalCallCount === undefined) _internalCallCount = 0;
    var instance;
    instance = Object.create(Class_.prototype);
    //console.log('='.repeat(_internalCallCount) + '> ' + className, Class_, args, instance);
    Object.keys(this._globals).forEach(function (key) {
      Object.defineProperty(instance, key, {
        enumerable: false,
        writable: false,
        configurable: true,
        value: _this6._globals[key]
      });
    });
    if (Class_.dependencies) {
      return this._resolveDependencies(instance, Class_.dependencies, _internalCallCount).then(function () {
        console.log("resolved", Class_.dependencies);
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
    return Promise.resolve(instance);
  };

  return Di;
})();

exports.Di = Di;
//# sourceMappingURL=Di.js.map