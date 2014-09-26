exports.ClassC = (function() {
    var ClassC = function() {
    };
    ClassC.dependencies = { 'classB': { className: 'ClassB', arguments: ['John'] } };

    ClassC.prototype.sayHello = function() {
        return this.classB.sayHello();
    };
    return ClassC;
})();
