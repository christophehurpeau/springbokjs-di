exports.dependencies = {
    class2: {
        name: 'Class2',
        call: {
            setName: ['John'],
        }
    },
    e: 'e'
};

exports.sayHello = function() {
    return this.class2.sayHello();
};
