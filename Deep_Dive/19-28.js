function Person(name) {
    this.name = name;
}

Person.prototype = {
    constructor: Person,
    sayHello() {
        console.log(`Hi! Mi name is ${this.name}`);
    }
};

const me = new Person('Lee');
const you = new Person('Kim');

me.sayHello();
you.sayHello();