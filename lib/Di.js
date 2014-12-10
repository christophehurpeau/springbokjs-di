"use strict";

var path = require("path");
var Di = (function () {
  var Di = function Di() {
    this._classes = {};
    this._all = {};
  };

  Di.prototype.add = function (name, value) {
    this._add(name, value);
    if (this._classes[name]) {
      return Promise.resolve();
    }
    return this._resolveDependencies(value, value.dependencies, 0).then(function () {
      return value.initialize && value.initialize();
    });
  };

  Di.prototype.addClass = function (className, class_) {
    return this.add(className, class_);
  };

  Di.prototype.get = function (key) {
    return this[key];
  };

  Di.prototype.set = function (key, value) {
    this._all[key] = this[key] = value;
  };

  Di.prototype.addModule = function (name, module) {
    var value = module;
    if (typeof module === "object" && module["default"]) {
      value = module["default"];
      value.dependencies = module.dependencies;
    }
    this._add(name, value);
    return value;
  };

  Di.prototype.addAll = function (map) {
    var _this = this;
    var objects = [];
    Object.keys(map).forEach(function (name) {
      var value = _this.addModule(name, map[name]);
      if (!_this._classes[name]) {
        objects.push(value);
      }
    });
    return this._resolveDependenciesForObjects(objects, 0).then(function () {
      return Promise.all(objects.map(function (object) {
        return object.initialize && object.initialize();
      }));
    }).then(function () {
      return _this;
    });
  };

  Di.prototype._resolveDependenciesForObjects = function (objects, _internalCallCount) {
    var _this2 = this;
    var promises = [];
    objects.forEach(function (value) {
      if (value.dependencies) {
        promises.push(_this2._resolveDependencies(value, value.dependencies, _internalCallCount));
      }
    });
    return Promise.all(promises);
  };

  Di.prototype._resolveDependencies = function (value, dependencies, _internalCallCount) {
    var _this3 = this;
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
        promises.push(_this3.createInstance(dependency.name, dependency.arguments, _internalCallCount).then(function (instance) {
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
        if (!_this3._all[dependency.name]) {
          throw new Error("Failed to resolve dependency " + dependency.name);
        }
        value[dependency.key] = _this3._all[dependency.name];
      }
    });

    return Promise.all(promises);
  };

  Di.prototype._add = function (name, value) {
    this._all[name] = this[name] = value;
    value.di = this;
    var basename = path.basename(name);
    if (typeof value === "function" && basename[0].toUpperCase() === basename[0]) {
      this._classes[name] = value;
      if (!value.createInstance) {
        value.createInstance = this.createInstance.bind(this, name);
      }
      if (!value.prototype.resolveDependencies) {
        var di = this;
        value.prototype.resolveDependencies = function (_internalCallCount) {
          if (_internalCallCount === undefined) _internalCallCount = 0;
          this.resolveDependencies = function () {};
          if (value.dependencies) {
            return di._resolveDependencies(this, value.dependencies, _internalCallCount + 1);
          }
        };
      }
    }
    if (value.dependencies) {
      value.dependencies = this.parseDependencies(value.dependencies);
    }
  };

  Di.prototype.parseDependencies = function (dependencies) {
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
  };

  Di.prototype.createInstance = function (className, args, _internalCallCount) {
    if (_internalCallCount === undefined) _internalCallCount = 0;
    //console.log('='.repeat(_internalCallCount) + '> ' + 'Creating instance of ' + className);
    if (!className) {
      throw new Error("Unexpected value for className");
    }
    var instance, Class_ = this._classes[className];
    if (!Class_) {
      throw new Error("Class " + className + " not found");
    }
    if (args) {
      instance = Object.create(Class_.prototype);
      Class_.apply(instance, args);
      // or instance = new (Class_.bind.apply(Class_, args))();
    } else {
      instance = new Class_();
    }
    //console.log('='.repeat(_internalCallCount) + '> ' + className, Class_, args, instance);
    instance.di = this;
    if (Class_.dependencies) {
      return instance.resolveDependencies(_internalCallCount).then(function () {
        return instance.initialize && instance.initialize();
      }).then(function () {
        return instance;
      });
    }
    return Promise.resolve(instance.initialize && instance.initialize()).then(function () {
      return instance;
    });
  };

  return Di;
})();

exports.Di = Di;
//# sourceMappingURL=Di.js.map