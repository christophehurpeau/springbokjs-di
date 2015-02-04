exports.Class1 = (function() {
    var Class1 = function(name) {
        this.name = name;
    };
    Class1.prototype.sayHello = function() {
        return 'Hello ' + this.name + '!';
    };
    return Class1;
})();
