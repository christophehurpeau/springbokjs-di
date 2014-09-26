"use strict";
require('es6-shim');
var assert = require('proclaim');
var expect = assert.strictEqual;
var Di = require('../../lib/').Di;
test('should load classes in the directory and return the right result', function() {
  var di = new Di();
  return di.directory(__dirname + '/../../samples/').then(function() {
    assert.isFunction(di._classes.ClassA);
    assert.isFunction(di._classes.ClassB);
    assert.isFunction(di._classes.ClassC);
    assert.isFunction(di._classes.ClassD);
    return Promise.all([di.getInitializedInstance('ClassC').then(function(classC) {
      expect('Hello John!', classC.sayHello());
    }), di.getInitializedInstance('ClassD').then(function(classD) {
      expect('Hello John!', classD.sayHello());
    })]);
  });
});

//# sourceMappingURL=test.js.map