exports.B = (function() {
    var B = function() {
    };
    B.singleton = true;
    B.dependencies = ['a'];

    B.prototype.sayHello = function(name) {
        return this.a.sayHello(name);
    };
    return B;
})();
