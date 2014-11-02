/* global test */
"use strict";
require('es6-shim');
var assert = require('proclaim');
var expect = assert.strictEqual;
var lib = '../../lib' + (process.env.TEST_COV && '-cov' || '') + '/';

var Di = require(lib).Di;

test('should load classes in the directory and return the right result', function() {
    var di = new Di();
    return di.directory(__dirname + '/../../samples/').then(function() {
        assert.isObject(di.a);
        assert.isObject(di.b);
        assert.isObject(di.c);
        assert.isObject(di.d);
        assert.isFunction(di._classes.Class1);
        assert.isFunction(di._classes.Class2);

        expect(di.a.sayHello('Test'), 'Hello Test!');
        expect(di.b.sayHello('Test'), 'Hello Test!');
        expect(di.c.sayHello(), 'Hello John!');
        expect(di.d.sayHello(), 'Hello John!');

        return Promise.all([
            di.createInstance('Class1', ['John']).then(function(class1) {
                expect('Hello John!', class1.sayHello());
            })
        ]);
    });
});

//# sourceMappingURL=test.js.map