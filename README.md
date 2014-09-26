# springbokjs-di  [![NPM version][npm-image]][npm-url] [![Build Status][build-status-image]][build-status-url] [![Coverage][coverage-image]][coverage-url]

[build-status-image]: https://drone.io/github.com/christophehurpeau/springbokjs-di/status.png
[build-status-url]: https://drone.io/github.com/christophehurpeau/springbokjs-di/latest
[npm-image]: https://img.shields.io/npm/v/springbokjs-di.svg?style=flat
[npm-url]: https://npmjs.org/package/springbokjs-di
[coverage-image]: http://img.shields.io/badge/coverage-100%-brightgreen.svg?style=flat
[coverage-url]: http://christophehurpeau.github.io/springbokjs-di/docs/coverage.html


Dependency injection library


## How to use

### ES5

`classes/ClassA.js` a singleton class

```js
exports.ClassA = (function() {
    var ClassA = function() {

    };
    ClassA.singleton = true; // the di will create a unique instance of the class
    ClassA.prototype.sayHello = function(name) {
        console.log('Hello ' + name + '!');
    };
    return ClassA;
})();
```

`classes/ClassB.js`

```js
exports.ClassB = (function() {
    var ClassB = function(name) {
        this.name = name;
    };
    ClassB.dependencies = [ 'classA' ]; // use the singleton
    ClassB.prototype.sayHello = function() {
        this.classA.sayHello(this.name);
    };
    return ClassB;
})();
```

`classes/ClassC.js`

```js
exports.ClassC = (function() {
    var ClassC = function() {
    };
    ClassC.dependencies = { 'classB': { name: 'ClassB', arguments: ['John'] } };

    ClassC.prototype.sayHello = function() {
        this.classB.sayHello();
    };
    return ClassC;
})();
```

You can also use the di in the class (if classD is loaded by the di)


`classes/ClassD.js`

```js
exports.ClassD = (function() {
    var ClassD = function() {
    };
    ClassD.prototype.initialize = function() {
        this.classB = this.di.createInstance('ClassB', ['John']);
    };

    ClassD.prototype.sayHello = function() {
        this.classB.sayHello();
    };
    return ClassD;
})();
```


`app.js`

```js
var Di = require('springbokjs-di').Di;
var di = new Di();
di.directory('classes/').then(function() { // load classes from the directory
    return di.getInitializedInstance('ClassD').then(function(classD) {
        classD.sayHello();
    });
});

```


### ES6

`classes/ClassA.js` a singleton class

```js
export var singleton = true; // the di will create a unique instance of the class
export class ClassA {
    sayHello(name) {
        console.log(`Hello ${ name }!');
    };
}
```

`classes/ClassB.js`

```js
export var dependencies = [ 'classA' ]; // use the singleton
export class ClassB {
    constructor(name) {
        this.name = name;
    }
    sayHello() {
        this.classA.sayHello(this.name);
    }
}
```

`classes/ClassC.js`

```js
export var dependencies = { 'classB': { name: 'ClassB', arguments: ['John'] };
export class ClassC {
    sayHello() {
        this.classB.sayHello();
    }
}
```

You can also use the di in the class (if classD is loaded by the di)


`classes/ClassC.js`

```js
export classClassD {
    constructor() {
        this.classB = this.di.createInstance('ClassB', ['John']);
    }
    sayHello() {
        this.classB.sayHello();
    };
}
```


`app.js`

```js
var Di = require('springbokjs-di').Di;
var di = new Di();
di.directory('classes/').then(() => { // load classes from the directory
    return di.getInitializedInstance('ClassD').then((classD) => {
        classD.sayHello();
    });
});
```
