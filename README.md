# springbokjs-di  [![NPM version][npm-image]][npm-url] [![Build Status][build-status-image]][build-status-url] [![Coverage][coverage-image]][coverage-url]

[![Greenkeeper badge](https://badges.greenkeeper.io/christophehurpeau/springbokjs-di.svg)](https://greenkeeper.io/)

[build-status-image]: https://drone.io/github.com/christophehurpeau/springbokjs-di/status.png
[build-status-url]: https://drone.io/github.com/christophehurpeau/springbokjs-di/latest
[npm-image]: https://img.shields.io/npm/v/springbokjs-di.svg?style=flat
[npm-url]: https://npmjs.org/package/springbokjs-di
[coverage-image]: http://img.shields.io/badge/coverage-79%-yellow.svg?style=flat
[coverage-url]: http://christophehurpeau.github.io/springbokjs-di/docs/coverage.html


Dependency injection library


## How to use

### ES5

`lib/a.js` a simple singleton

```js
exports.A = (function() {
    var A = function() {
    };
    A.singleton = true;

    A.prototype.sayHello = function(name) {
        return 'Hello ' + name + '!';
    };
    return A;
})();
```

`lib/b.js` b has a dependency with a

```js
exports.B = (function() {
    var B = function() {
    };
    B.singleton = true;
    B.dependencies = ['a'];

    B.prototype.sayHello = function(name) {
        return this.a.sayHello(name);
    };
    return B;
})();
```

`lib/class1.js` An example of non singleton class

```js
exports.Class1 = (function() {
    var Class1 = function(name) {
        this.name = name;
    };
    Class1.prototype.sayHello = function() {
        return 'Hello ' + this.name + '!';
    };
    return Class1;
})();
```

`lib/class2.js` For classes, the dependencies are resolved when a class is instancied

```js
exports.Class2 = (function() {
    var Class2 = function() {
    };
    Class2.dependencies = ['a'];

    Class2.prototype.setName = function(name) {
        this.name = name;
    };
    Class2.prototype.sayHello = function() {
        return this.a.sayHello(this.name);
    };
    return Class2;
})();
```


`app.js`

```js
var diUtils = require('springbokjs-di');
var Di = diUtils.Di;
var di = new Di();
diUtils.directory(di, 'lib/').then(function() { // load classes from the directory
    return di.a.then(function(a) {
        a.sayHello('James');
    }).then(function() {
        return di.createInstance('Class1', ['James']).then(function(class1) {
            class1.sayHello();
        })
    });
});

```


### ES6 with es6like-class

`lib/a.js` a simple singleton

```js
export var A = newClass({
    static: {
        singleton: true
    },

    sayHello(name) {
        return 'Hello ' + name + '!';
    };
});
```

`lib/b.js` b has a dependency with a

```js
export var B = newClass({
    static: {
        singleton: true,
        dependencies: ['a']
    },

    sayHello(name) {
        return this.a.sayHello(name);
    };
});
```

`lib/class1.js` An example of non singleton class

```js
export class Class1 {
    constructor(name) {
        this.name = name;
    }

    sayHello() {
        return 'Hello ' + this.name + '!';
    }
}
```

`lib/class2.js` For classes, the dependencies are resolved when a class is instancied

```js
export var Class2 = newClass({
    static: {
        dependencies: ['a']
    },
    setName(name) {
        this.name = name;
    },
    sayHello() {
        return this.a.sayHello(this.name);
    }
});
```

`app.js`

```js
var diUtils = require('springbokjs-di');
var Di = diUtils.Di;
var di = new Di();
diUtils.directory(di, 'classes/').then(() => { // load classes from the directory
    return di.a.then((a) => {
        a.sayHello('James');
    }).then(() => {
        return di.createInstance('Class1', ['James']).then((class1) => {
            class1.sayHello();
        })
    });
});

```

