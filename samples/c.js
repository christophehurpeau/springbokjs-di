exports.C = (function() {
    var C = function() {
    };
    C.singleton = true;
    C.dependencies = {
        class2: {
            name: 'Class2',
            call: {
                setName: ['John'],
            }
        }
    };

    C.prototype.sayHello = function() {
        return this.class2.sayHello();
    };
    return C;
})();
