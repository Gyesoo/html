const Person = (function () {
    function Person(name) {
        this.name = name;
    }

    Person.prototype = {
        constructor: Person,
        sayHello() {
            console.log(`Hi! My name is ${this.name}`);
        }
    };

    Object.freeze(Person.prototype);

    return Person;
}());

const me = new Person('Lee');

me.sayHello = function () {
    console.log(`Hey! My name is ${this.name}`);
};

delete me.sayHello;

me.sayHello();

delete Person.prototype.sayHello;
me.sayHello();

console.log(me.constructor  === Person);