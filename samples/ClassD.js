exports.ClassD = (function() {
    var ClassD = function() {
    };
    ClassD.prototype.initialize = function() {
        this.classB = this.di.createInstance('ClassB', ['John']);
    };

    ClassD.prototype.sayHello = function() {
        return this.classB.sayHello();
    };
    return ClassD;
})();
