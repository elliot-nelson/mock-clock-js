var Promise = require('./promise');

var _setTimeout = setTimeout;
var nextTick = function (fn) {
    _setTimeout(fn, 0);
}
if (typeof process === 'object' && process.nextTick) {
    nextTick = process.nextTick;
}

function Clock(context) {
    var self = this;

    this.context = context;
    this.original = {};
    this.installed = false;
    this.queue = [];
    this.time = 0;
}

Clock.prototype.install = function install() {
    if (this.installed) {
        throw new Error('mock-clock already installed in this context');
    }
    if (this.destroyed) {
        throw new Error('this instance of mock-clock is stale and cannot be reused');
    }

    this.installFunction('setTimeout');
    this.installFunction('clearTimeout');
    this.installFunction('setInterval');
    this.installFunction('clearInterval');
    this.installDate();
    this.installed = true;

    return this;
};

Clock.prototype.installFunction = function installFunction(fnName) {
    var self = this;
    this.original[fnName] = this.context[fnName];
    this.context[fnName] = function () {
        return self[fnName].apply(self, arguments);
    };
    this.context[fnName].mock = true;
    this.context[fnName].original = this.original[fnName];
};

Clock.prototype.installDate = function installDate() {
    var self = this;
    this.original.Date = this.context.Date;

    this.Date = function () {
        var date = new (Function.prototype.bind.apply(self.original.Date, Array.prototype.concat.apply([self.original.Date], arguments)));
        if (arguments.length === 0) {
            date.setTime(self.time);
        }
        return date;
    };
    this.Date.prototype = this.original.Date.prototype;
    this.Date.__proto__ = this.original.Date;

    this.context.Date = this.Date;
    this.context.Date.mock = true;
    this.context.Date.original = this.original.Date;
};

Clock.prototype.uninstall = function uninstall() {
    if (!this.installed) {
        throw new Error('mock-clock not installed in this context');
    }

    this.uninstallFunction('setTimeout');
    this.uninstallFunction('clearTimeout');
    this.uninstallFunction('setInterval');
    this.uninstallFunction('clearInterval');
    this.uninstallDate();
    this.installed = false;
    this.destroyed = true;
    Clock.destroyClock(this.context);
};

Clock.prototype.uninstallFunction = function uninstallFunction(fnName) {
    this.context[fnName] = this.original[fnName];
};

Clock.prototype.uninstallDate = function () {
    this.uninstallFunction('Date');
};

Clock.prototype.tick = function (ms) {
    var self = this;

    if (ms === undefined) {
        ms = 1;
    }

    return new Promise(function (resolve) {
        nextTick(function () {
            ms -= 1;
            self.time += 1;

            while (self.queue[0] && self.queue[0]._at <= self.time) {
                var timer = self.queue.shift();
                if (timer._onTimeout) {
                    timer._onTimeout();
                }
                if (timer._onTimeout && timer._repeat && timer._repeat > 0) {
                    // Intervals are updated and enqueued again.
                    timer._at = self.time + timer._repeat;
                    self.enqueue(timer);
                }
            }

            if (ms > 0) {
                self.tick(ms).then(resolve);
            } else {
                resolve();
            }
        });
    });
};

Clock.prototype.ticks = function (ms) {
    return this.tick.bind(this, ms);
};

Clock.prototype.enqueue = function enqueue(timer) {
    this.queue.push(timer);
    this.queue.sort(function (a, b) {
        return a._at - b._at;
    });
};

Clock.prototype.setTimeout = function setTimeout(fn, ms) {
    var fnArgs = Array.prototype.slice.call(arguments, 2);

    if (fnArgs.length > 0) {
        fn = fn.bind.apply(fn, [undefined].concat(fnArgs));
    }

    var timer = {
        _at: this.time + ms,
        _onTimeout: fn
    };
    this.enqueue(timer);
    return timer;
};

Clock.prototype.setInterval = function setInterval(fn, ms) {
    var fnArgs = Array.prototype.slice.call(arguments, 2);

    if (fnArgs.length > 0) {
        fn = fn.bind.apply(fn, [undefined].concat(fnArgs));
    }

    var timer = {
        _at: this.time + ms,
        _repeat: this.time + ms,
        _onTimeout: fn
    };
    this.enqueue(timer);
    return timer;
};

Clock.prototype.clearTimeout = function clearTimeout(timer) {
    // Remove timer from the queue
    for(var i = 0; i < this.queue.length; i++) {
        if (this.queue[i] === timer) {
            this.queue.splice(i, 1);
            break;
        }
    }

    // Ensure existing references to timer don't fire
    if (timer && timer._onTimeout) {
        timer._onTimeout = null;
    }
};

Clock.prototype.clearInterval = Clock.prototype.clearTimeout;

Clock.prototype.getTime = function () {
    return this.time;
};

Clock.prototype.setTime = function (time) {
    this.time = time;
};

Clock.cache = [];

Clock.getClock = function getClock(context) {
    for(var i = 0; i < Clock.cache.length; i++) {
        if (Clock.cache[i].context === context) {
            return Clock.cache[i].clock;
        }
    }

    var clock = new Clock(context);
    Clock.cache.push({
        context: context,
        clock: clock
    });
    return clock;
};

Clock.destroyClock = function destroyClock(context) {
    for(var i = 0; i < Clock.cache.length; i++) {
        if (Clock.cache[i].context === context) {
            Clock.cache.splice(i, 1);
            break;
        }
    }
};

var mockClock = {
    install: function () {
        var context = global;
        return Clock.getClock(context).install();
    },
    uninstall: function () {
        var context = global;
        return Clock.getClock(context).uninstall();
    },
    tick: function (ms) {
        var context = global;
        return Clock.getClock(context).tick(ms);
    },
    ticks: function (ms) {
        return mockClock.tick.bind(undefined, ms);
    },
    getTime: function () {
        var context = global;
        return Clock.getClock(context).getTime();
    },
    setTime: function (time) {
        var context = global;
        return Clock.getClock(context).setTime(time);
    }
};

module.exports = mockClock;
