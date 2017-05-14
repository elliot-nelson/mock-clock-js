var Promise = require('./promise');

var _setTimeout = setTimeout;
var nextTick = function (fn) {
    _setTimeout(fn, 0);
}
if (typeof process === 'object' && process.nextTick) {
    nextTick = process.nextTick;
}

function Clock(context) {
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

    this.installFunction('setTimeout');
    this.installFunction('clearTimeout');
    this.installed = true;
}

Clock.prototype.installFunction = function installFunction(fnName) {
    var self = this;
    this.original[fnName] = this.context[fnName];
    this.context[fnName] = function () {
        return self[fnName].apply(self, arguments);
    };
    this.context[fnName].mock = true;
    this.context[fnName].original = this.original[fnName];
}

Clock.prototype.uninstall = function uninstall() {
    if (!this.installed) {
        throw new Error('mock-clock not installed in this context');
    }

    this.uninstallFunction('setTimeout');
    this.uninstallFunction('clearTimeout');
    this.installed = false;
};

Clock.prototype.uninstallFunction = function uninstallFunction(fnName) {
    this.context[fnName] = this.original[fnName];
};

Clock.prototype.tick = function (ms) {
    var self = this;

    return new Promise(function (resolve) {
        nextTick(function () {
            //console.log(['tick', ms, self.queue, self.time]);
            ms -= 1;
            self.time += 1;

            if (self.queue[0] && self.queue[0]._at <= self.time) {
                self.queue.shift()._onTimeout();
            }

            if (ms > 0) {
                self.tick(ms).then(resolve);
            } else {
                resolve();
            }
        });
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

    this.queue.push(timer);
    this.queue.sort(function (a, b) {
        return a._at - b._at;
    });

    return timer;
};

Clock.prototype.clearTimeout = function clearTimeout (timer) {
    for(var i = 0; i < this.queue.length; i++) {
        if (this.queue[i] === timer) {
            this.queue.splice(i, 1);
            break;
        }
    }
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
        var clock = Clock.getClock(context);

        clock.install();
        return clock;
    },
    uninstall: function () {
        var context = global;
        var clock = Clock.getClock(context);

        clock.uninstall();
        Clock.destroyClock(context);
    },
    tick: function (ms) {
        var context = global;
        var clock = Clock.getClock(context);

        return clock.tick(ms || 1);
    },
    ticks: function (ms) {
        return mockClock.tick.bind(undefined, ms);
    }
};

module.exports = mockClock;
