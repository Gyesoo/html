function Circle(radius) {
    console.log(this);

    this.radius = radius;
    this.getDiameter = function () {
        return 2 * this.radius;
    };
    return 100;
}

const circle = new Circle(1);
console.log(circle.getDiameter());