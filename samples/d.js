exports.initialize = function() {
    return this.di.createInstance('Class1', ['John'])
        .then(function(class1) { this.class1 = class1; }.bind(this));
};

exports.sayHello = function() {
    return this.class1.sayHello();
};
