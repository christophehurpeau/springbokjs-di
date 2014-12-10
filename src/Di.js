var path = require('path');
export class Di {
    constructor() {
        this._classes = {};
        this._all = {};
    }

    add(name, value) {
        this._add(name, value);
        if (this._classes[name]) {
            return Promise.resolve();
        }
        return this._resolveDependencies(value, value.dependencies, 0)
            .then(() => {
                return value.initialize && value.initialize();
            });
    }

    addClass(className, class_) {
        return this.add(className, class_);
    }

    get(key) {
        return this[key];
    }

    set(key, value) {
        this._all[key] = this[key] = value;
    }

    addModule(name, module) {
        var value = module;
        if (typeof module === 'object' && module.default) {
            value = module.default;
            value.dependencies = module.dependencies;
        }
        this._add(name, value);
        return value;
    }

    addAll(map) {
        var objects = [];
        Object.keys(map).forEach((name) => {
            var value = this.addModule(name, map[name]);
            if (!this._classes[name]) {
                objects.push(value);
            }
        });
        return this._resolveDependenciesForObjects(objects, 0).then(() => {
            return Promise.all(objects.map((object) => {
                return object.initialize && object.initialize();
            }));
        }).then(() => this);
    }

    _resolveDependenciesForObjects(objects, _internalCallCount) {
        var promises = [];
        objects.forEach((value) => {
            if (value.dependencies) {
                promises.push(this._resolveDependencies(value, value.dependencies, _internalCallCount));
            }
        });
        return Promise.all(promises);
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
            //console.log('='.repeat(_internalCallCount) + '> ' + 'Resolving dependency ' + dependency.key);
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
                    throw new Error('Failed to resolve dependency ' + dependency.name);
                }
                value[dependency.key] = this._all[dependency.name];
            }
        });

        return Promise.all(promises);
    }

    _add(name, value) {
        this._all[name] = this[name] = value;
        value.di = this;
        var basename = path.basename(name);
        if (typeof value === 'function' && basename[0].toUpperCase() === basename[0]) {
            this._classes[name] = value;
            if (!value.createInstance) {
                value.createInstance = this.createInstance.bind(this, name);
            }
            if (!value.prototype.resolveDependencies) {
                var di = this;
                value.prototype.resolveDependencies = function(_internalCallCount = 0) {
                    this.resolveDependencies = function() {};
                    if (value.dependencies) {
                        return di._resolveDependencies(this, value.dependencies, _internalCallCount + 1);
                    }
                };
            }
        }
        if (value.dependencies) {
            value.dependencies = this.parseDependencies(value.dependencies);
        }
    }

    parseDependencies(dependencies) {
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
    }

    createInstance(className, args, _internalCallCount = 0) {
        //console.log('='.repeat(_internalCallCount) + '> ' + 'Creating instance of ' + className);
        if (!className) {
            throw new Error('Unexpected value for className');
        }
        var instance, Class_ = this._classes[className];
        if (!Class_) {
            throw new Error('Class ' + className + ' not found');
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
            return instance.resolveDependencies(_internalCallCount)
                .then(() => instance.initialize && instance.initialize())
                .then(() => instance);
        }
        return Promise.resolve(instance.initialize && instance.initialize()).then(() => instance);
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
