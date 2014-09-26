exports.ClassA = (function() {
    var ClassA = function() {

    };
    ClassA.singleton = true; // the di will create a unique instance of the class
    ClassA.prototype.sayHello = function(name) {
        return 'Hello ' + name + '!';
    };
    return ClassA;
})();
