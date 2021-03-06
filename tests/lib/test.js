/* global test */
'use strict';

require('es6-shim');
var assert = require('proclaim');
var expect = assert.strictEqual;
console.log(process.env.TEST_COV);
var lib = '../../lib' + (process.env.TEST_COV ? '-cov' : '') + '/';

var diUtils = require(lib);
var Di = require(lib).Di;

test('should load classes in the directory and return the right result', function () {
    var di = new Di();
    return diUtils.directory(di, __dirname + '/../../samples/').then(function () {
        assert.isObject(di.a);
        assert.isObject(di.b);
        assert.isObject(di.c);
        assert.isFunction(di._classes.Class1);
        assert.isFunction(di._classes.Class2);

        expect(di.a.sayHello('Test'), 'Hello Test!');
        expect(di.b.sayHello('Test'), 'Hello Test!');
        expect(di.c.sayHello(), 'Hello John!');

        var class1 = di.createInstance('Class1', ['John']);
        expect('Hello John!', class1.sayHello());
    });
});
//# sourceMappingURL=test.js.map