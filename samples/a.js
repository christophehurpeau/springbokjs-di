exports.A = (function() {
    var A = function() {
    };
    A.singleton = true;

    A.prototype.sayHello = function(name) {
        return 'Hello ' + name + '!';
    };
    return A;
})();
