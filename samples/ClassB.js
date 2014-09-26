exports.ClassB = (function() {
    var ClassB = function(name) {
        this.name = name;
    };
    ClassB.dependencies = [ 'classA' ]; // use the singleton
    ClassB.prototype.sayHello = function() {
        return this.classA.sayHello(this.name);
    };
    return ClassB;
})();
