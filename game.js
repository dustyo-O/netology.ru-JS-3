'use strict';

class Vector {
    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }

    plus(vector) {

        if (!(vector instanceof(Vector))) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        }
        return new Vector(this.x+vector.x, this.y + vector.y);
    }

    times(n) {
        return new Vector(this.x * n, this.y * n);
    }
}

class Actor {
    constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector()) {
        if (!(pos instanceof(Vector))) throw new Error('');
        if (!(size instanceof(Vector))) throw new Error('');
        if (!(speed instanceof(Vector))) throw new Error('');
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }

    act() {}

    get left() {
        return this.pos.x;
    }
    get top() {
        return this.pos.y;
    }
    get right() {
        return this.pos.plus(this.size).x;
    }
    get bottom() {
        return this.pos.plus(this.size).y;
    }

    get type() {
        return 'actor';
    }

    isIntersect(actor) {
        if (actor === this) return false;
        if (actor.right <= this.left) return false; //объект левее
        if (actor.left >= this.right) return false; //объект правее
        if (actor.bottom <= this.top) return false; //объект выше
        if (actor.top >= this.bottom) return false; //объект ниже
        if ((actor.size.x < 0) || (actor.size.y < 0)) return false;
        return true;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid.slice();
        this.actors = actors.slice();
        this.height = this.grid.length;
        this.width = (this.grid[0]) ? this.grid[0].length : 0;
        this.status = null;
        this.finishDelay = 1;
    }

    get player() {
        return this.actors.filter(actor => actor.type === 'player')[0];
    }

    isFinished() {
        return ((this.status !== null) && (this.finishDelay < 0));
    }

    actorAt(obj) {
        for (let actor of this.actors) {
            if (actor.isIntersect(obj)) return actor;
        }
        if (this.actors.length === 0) return undefined;
        return undefined;
    }

    obstacleAt(pos, size) {
        if (pos.x < 0) return 'wall';
        if (pos.plus(size).x > this.width) return 'wall';
        if (pos.y < 0) return 'wall';
        if (pos.plus(size).y > this.height) return 'lava';
        for (let y of this.grid) {
            for (let x of y) {
                if (x) return x;
            }
        }
    }

    removeActor(actor) {
        this.actors.splice(this.actors.indexOf(actor), 1);
    }

    noMoreActors(type) {
        if (this.actors.length === 0) return true;
        for (let actor of this.actors) {
            if (actor.type === type) return false;
        }
        return true;
    }

    playerTouched(type, actor) {
        if (type === 'lava'|| 'fireball') this.status = 'lost';
        if ((type === 'coin') && actor) {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) this.status = 'won';
        }
    }
}

class LevelParser {
    constructor(dict) {
        this.dict = dict;
    }

    actorFromSymbol(symbol) {
        return (symbol !== undefined) ? this.dict[symbol] : undefined;
    }

    obstacleFromSymbol(symbol) {
        switch (symbol) {
            case 'x' : return 'wall';
            case '!' : return 'lava';
            default : return undefined;
        }
    }

    createGrid(scheme) {
        return scheme.reduce((result, string) => {
            const obstacles = string.split('').map(symbol => this.obstacleFromSymbol(symbol));
            result.push(obstacles);
            return result;
        }, []);
    }

    createActors(scheme) {
        const actors = [];
        if (this.dict) {
            scheme.forEach((string, y) => {
                string.split('').forEach((symbol, x) => {
                    if (symbol in this.dict) {
                        try {
                            const actor = new this.dict[symbol](new Vector(x, y));
                            if (actor instanceof(Actor)) actors.push(actor);
                        } catch(err) {
                            return false;
                        }
                    }
                });
            });
        }
        return actors;
    }

    parse(plan) {
        let grid =  this.createGrid(plan),
            actors = this.createActors(plan);
        return new Level(grid, actors);
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(), speed = new Vector()) {
        super(pos);
        this.speed = speed;
        this.size = new Vector(1, 1);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        const   next = this.getNextPosition(time),
                obstacle = level.obstacleAt(next, this.size);
        if (obstacle) {
            this.handleObstacle();
        } else {
            this.pos = next;
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos);
        this.speed = new Vector(2, 0);
        this.size = new Vector(1, 1);
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos);
        this.speed = new Vector(0, 2);
        this.size = new Vector(1, 1);
    }
}

class FireRain extends VerticalFireball {
    constructor(pos) {
        super(pos);
        this.start = pos;
        this.speed = new Vector(0, 3);
        this.size = new Vector(1, 1);
    }

    handleObstacle() {
        this.pos = this.start;
    }
}

class Coin extends Actor {
    constructor(pos) {
        super(pos);
        this.pos = this.pos.plus(new Vector(.2, .1));
        this.size = new Vector(.6, .6);
        this.springSpeed = 8;
        this.springDist = .07;
        this.spring = Math.random(0, 2 * Math.PI);
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.spring += this.springSpeed * time;
        return this.pos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos) {
        super(pos);
        this.pos = this.pos.plus(new Vector(0, -.5));
        this.size = new Vector(.8, 1.5);
    }

    get type() {
        return 'player';
    }
}
