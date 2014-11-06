exports.dependencies = {
    class2: {
        name: 'Class2',
        call: {
            setName: ['John'],
        }
    }
};

exports.sayHello = function() {
    return this.class2.sayHello();
};
