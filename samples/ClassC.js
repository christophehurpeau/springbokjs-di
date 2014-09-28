exports.dependencies = { 'classB': { className: 'ClassB', arguments: ['John'] }, 'ClassE': 'ClassE' };
exports.ClassC = (function() {
    var ClassC = function() {
    };
    ClassC.prototype.sayHello = function() {
        return this.classB.sayHello();
    };
    return ClassC;
})();
