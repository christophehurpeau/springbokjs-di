"use strict";
Object.defineProperties(exports, {
  Di: {get: function() {
      return Di;
    }},
  __esModule: {value: true}
});
var $__Object$defineProperty = Object.defineProperty;
var fs = require('springbokjs-utils/fs');
var Di = function() {
  "use strict";
  function Di() {
    this._classes = {};
  }
  $__Object$defineProperty(Di.prototype, "_forEachDependencies", {
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
    },
    enumerable: false,
    writable: true
  });
  $__Object$defineProperty(Di.prototype, "directory", {
    value: function(paths) {
      if (!Array.isArray(paths)) {
        paths = [paths];
      }
      var singletons = [];
      return Promise.all(paths.map(function(path) {
        return fs.readRecursiveDirectory(path, {recursive: true}, function(file) {
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
        }.bind(this));
      }.bind(this))).then(function() {
        var countMissingDependencies = function(dependencies) {
          if (!dependencies) {
            return 0;
          }
          if (Array.isArray(dependencies)) {
            return dependencies.filter(function(key) {
              return this[dependencies[key]] === undefined;
            }.bind(this)).length;
          } else {
            return Object.keys(dependencies).filter(function(key) {
              return this[dependencies[key]] === undefined;
            }.bind(this)).length;
          }
        }.bind(this);
        var sort = function() {
          singletons = singletons.sort(function(a, b) {
            return countMissingDependencies(this._classes[a].dependencies) - countMissingDependencies(this._classes[b].dependencies);
          }.bind(this));
        }.bind(this);
        var i = 0,
            promises = [];
        do {
          var className = singletons.shift(),
              Singleton = this._classes[className];
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
          return Promise.reject('Failed to load dependencies (circular ?)');
        }
        return Promise.all(promises);
      }.bind(this)).then(function() {
        return this;
      }.bind(this));
    },
    enumerable: false,
    writable: true
  });
  $__Object$defineProperty(Di.prototype, "addClass", {
    value: function(className, class_) {
      this._classes[className] = this[className] = class_;
      if (class_.singleton) {
        return this.getInitializedInstance(className);
      }
    },
    enumerable: false,
    writable: true
  });
  $__Object$defineProperty(Di.prototype, "get", {
    value: function(key) {
      return this[key];
    },
    enumerable: false,
    writable: true
  });
  $__Object$defineProperty(Di.prototype, "createInstance", {
    value: function(className, args) {
      if (!className) {
        throw new Error('Unexpected value for className');
      }
      var instance,
          Class_ = this._classes[className];
      if (args) {
        instance = Object.create(Class_.prototype);
        Class_.apply(instance, args);
      } else {
        instance = new Class_();
      }
      instance.di = this;
      if (Class_.dependencies) {
        this._forEachDependencies(Class_.dependencies, function(key, dependency) {
          if (typeof dependency === 'string') {
            instance[key] = this[dependency];
          } else if (dependency.name) {
            instance[key] = this[dependency.name];
          } else {
            instance[key] = this.createInstance(dependency.className, dependency.arguments);
          }
          if (!instance[key]) {
            throw new Error('Unable to resolve dependency ' + JSON.stringify(dependency) + ' for class ' + className);
          }
        }.bind(this));
      }
      return instance;
    },
    enumerable: false,
    writable: true
  });
  $__Object$defineProperty(Di.prototype, "getInitializedInstance", {
    value: function(className) {
      var instance = this.createInstance(className);
      return Promise.resolve(instance.initialize && instance.initialize()).then(function() {
        return instance;
      });
    },
    enumerable: false,
    writable: true
  });
  return Di;
}();

//# sourceMappingURL=index.js.map