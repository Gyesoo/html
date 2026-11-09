function Person(name) {
    this.name = name;
}

const me = new Person('Lee');

console.log(me.constructor === Person);