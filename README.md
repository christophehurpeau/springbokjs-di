# springbokjs-di  [![NPM version][npm-image]][npm-url] [![Build Status][build-status-image]][build-status-url] [![Coverage][coverage-image]][coverage-url]

[build-status-image]: https://drone.io/github.com/christophehurpeau/springbokjs-di/status.png
[build-status-url]: https://drone.io/github.com/christophehurpeau/springbokjs-di/latest
[npm-image]: https://img.shields.io/npm/v/springbokjs-di.svg?style=flat
[npm-url]: https://npmjs.org/package/springbokjs-di
[coverage-image]: http://img.shields.io/badge/coverage-79%-yellow.svg?style=flat
[coverage-url]: http://christophehurpeau.github.io/springbokjs-di/docs/coverage.html


Dependency injection library


## How to use

### ES5

`lib/a.js` a simple object

```js
exports.sayHello = function(name) {
    return 'Hello ' + name + '!';
};
```

`lib/b.js` b has a dependency with a

```js
exports.dependencies = [ 'a' ];

exports.sayHello = function(name) {
    return this.a.sayHello(name);
};
```

`lib/class1.js` For classes, the dependencies are resolved when a class is instancied

```js
exports.dependencies = [ 'a' ];

exports.default = (function() {
    var Class1 = function() {
    };
    Class1.prototype.setName = function(name) {
        this.name = name;
    };
    Class1.prototype.sayHello = function() {
        return this.a.sayHello(this.name);
    };
    return Class1;
})();

```

`lib/c.js` c has a dependency with a class, and calls a method of the class

```js
exports.dependencies = {
    class2: {
        name: 'Class2',
        // arguments: []
        call: {
            setName: ['John'],
        }
    }
};

exports.sayHello = function() {
    return this.class2.sayHello();
};
```

`lib/d.js` You can also use the di in the class

```js
exports.initialize = function() {
    return this.di.createInstance('Class1', ['John'])
        .then(function(class1) { this.class1 = class1; });
};

exports.sayHello = function() {
    return this.class1.sayHello();
};

```


`app.js`

```js
var Di = require('springbokjs-di').Di;
var di = new Di();
di.directory('lib/').then(function() { // load classes from the directory
    return di.a.then(function(a) {
        a.sayHello('James');
    }).then(function() {
        return di.createInstance('Class1', ['James']).then(function(class1) {
            class1.sayHello();
        })
    });
});

```


### ES6

`lib/a.js` a simple object

```js
export function sayHello(name) {
    return `Hello ${ name }!`;
};
```

`lib/b.js` b has a dependency with a

```js
export var dependencies = [ 'a' ];

export var sayHello = function(name) {
    return this.a.sayHello(name);
};
```

`lib/class1.js` For classes, the dependencies are resolved when a class is instancied

```js
export var dependencies = [ 'a' ];

export default class Class1 {
    setName(name) {
        this.name = name;
    }
    sayHello() {
        return this.a.sayHello(this.name);
    }
}
```

`lib/c.js` c has a dependency with a class, and calls a method of the class

```js
export var dependencies = {
    class2: {
        name: 'Class2',
        // arguments: []
        call: {
            setName: ['John'],
        }
    }
};

export var sayHello = function() {
    return this.class2.sayHello();
};
```

`lib/d.js` You can also use the di in the class

```js
export var initialize = function() {
    return this.di.createInstance('Class1', ['John'])
        .then((class1) => this.class1 = class1);
};

export var sayHello = function() {
    return this.class1.sayHello();
};
```


`app.js`

```js
var Di = require('springbokjs-di').Di;
var di = new Di();
di.directory('classes/').then(() => { // load classes from the directory
    return di.a.then((a) => {
        a.sayHello('James');
    }).then(() => {
        return di.createInstance('Class1', ['James']).then((class1) => {
            class1.sayHello();
        })
    });
});

```

