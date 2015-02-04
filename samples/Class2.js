exports.Class2 = (function() {
    var Class2 = function() {
    };
    Class2.dependencies = ['a'];

    Class2.prototype.setName = function(name) {
        this.name = name;
    };
    Class2.prototype.sayHello = function() {
        return this.a.sayHello(this.name);
    };
    return Class2;
})();
