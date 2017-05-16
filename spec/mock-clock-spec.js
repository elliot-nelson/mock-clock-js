var Promise = require('bluebird');
var clock = require('../src/mock-clock');

describe('mock-clock', function () {
    describe('install', function () {
        it('installs custom version of setTimeout', function () {
            var original = setTimeout;

            clock.install();

            expect(setTimeout).not.toEqual(original);
            expect(setTimeout.mock).toBe(true);
            expect(setTimeout.original).toEqual(original);

            clock.uninstall();

            expect(setTimeout).toEqual(original);
            expect(setTimeout.mock).toBe(undefined);
        });

        it('installs custom version of clearTimeout', function () {
            var original = clearTimeout;

            clock.install();

            expect(clearTimeout).not.toEqual(original);
            expect(clearTimeout.mock).toBe(true);
            expect(clearTimeout.original).toEqual(original);

            clock.uninstall();

            expect(clearTimeout).toEqual(original);
            expect(clearTimeout.mock).toBe(undefined);
        });

        it('installs custom version of setInterval', function () {
            var original = setInterval;

            clock.install();

            expect(setInterval).not.toEqual(original);
            expect(setInterval.mock).toBe(true);
            expect(setInterval.original).toEqual(original);

            clock.uninstall();

            expect(setInterval).toEqual(original);
            expect(setInterval.mock).toBe(undefined);
        });

        it('installs custom version of clearInterval', function () {
            var original = clearInterval;

            clock.install();

            expect(clearInterval).not.toEqual(original);
            expect(clearInterval.mock).toBe(true);
            expect(clearInterval.original).toEqual(original);

            clock.uninstall();

            expect(clearInterval).toEqual(original);
            expect(clearInterval.mock).toBe(undefined);
        });

        it('installs custom version of Date', function () {
            var original = Date;

            clock.install();

            expect(Date).not.toEqual(original);
            expect(Date.mock).toBe(true);
            expect(Date.original).toEqual(original);

            clock.uninstall();

            expect(Date).toEqual(original);
            expect(Date.mock).toBe(undefined);
        });

        it('throws an exception if already installed', function () {
            clock.install();

            expect(function () {
                clock.install();
            }).toThrowError('mock-clock already installed in this context');

            clock.uninstall();
        });
    });

    describe('uninstall', function () {
        it('throws an exception if not installed', function () {
            expect(function () {
                clock.uninstall();
            }).toThrowError('mock-clock not installed in this context');
        });
    });

    describe('setTimeout', function () {
        it('adds a new timer to the queue', function () {
            var mock = clock.install();

            var a = setTimeout(function () { }, 500);
            expect(mock.queue).toEqual([a]);
            expect(mock.queue).toEqual([
                { _at: 500, _onTimeout: jasmine.any(Function) }
            ]);

            clock.uninstall();
        });

        it('automatically sorts added timers', function () {
            var mock = clock.install();
            mock.time = 2500;

            var a = setTimeout(function () { }, 1000);
            var b = setTimeout(function () { }, 250);
            var c = setTimeout(function () { }, 500);

            expect(mock.queue).toEqual([b, c, a]);
            expect(mock.queue).toEqual([
                { _at: 2750, _onTimeout: jasmine.any(Function) },
                { _at: 3000, _onTimeout: jasmine.any(Function) },
                { _at: 3500, _onTimeout: jasmine.any(Function) }
            ]);

            clock.uninstall();
        });
    });

    describe('clearTimeout', function () {
        it('clears a previously set timer', function () {
            var mock = clock.install();

            var a = setTimeout(function () { }, 120);
            expect(mock.queue.length).toBe(1);

            expect(clearTimeout(a)).toBe(undefined);
            expect(mock.queue.length).toBe(0);

            clock.uninstall();
        });

        it('returns undefined if a timer cannot be cleared', function () {
            clock.install();

            expect(clearTimeout()).toBe(undefined);
            expect(clearTimeout(188823)).toBe(undefined);
            expect(clearTimeout(describe)).toBe(undefined);

            clock.uninstall();
        });
    });

    describe('setInterval', function () {
        it('adds a new timer to the queue', function () {
            var mock = clock.install();

            var a = setInterval(function () { }, 500);
            expect(mock.queue).toEqual([a]);
            expect(mock.queue).toEqual([
                { _at: 500, _repeat: 500, _onTimeout: jasmine.any(Function) }
            ]);

            clock.uninstall();
        });
    });

    describe('clearInterval', function () {
        it('clears a previously set timer', function () {
            var mock = clock.install();

            var a = setInterval(function () { }, 120);
            expect(mock.queue.length).toBe(1);

            expect(clearInterval(a)).toBe(undefined);
            expect(mock.queue.length).toBe(0);

            clock.uninstall();
        });

        it('returns undefined if a timer cannot be cleared', function () {
            clock.install();

            expect(clearInterval()).toBe(undefined);
            expect(clearInterval(188823)).toBe(undefined);
            expect(clearInterval(describe)).toBe(undefined);

            clock.uninstall();
        });
    });

    describe('tick', function () {
        it('simulates time passing and calls queued functions', function (done) {
            var result = [];

            clock.install();

            Promise.try(function () {
                result.push(1);
            }).delay(250).then(function () {
                result.push(2);
            }).then(function () {
                result.push(3);
            }).delay(100).then(function () {
                result.push(4);
            });

            Promise.resolve().then(function () {
                result.push('a');
            }).delay(100).then(function () {
                result.push('b');
            }).delay(300).then(function () {
                result.push('c');
            });

            expect(result).toEqual([1]);
            Promise.resolve().then(function () {
                expect(result).toEqual([1, 'a']);
            }).then(clock.ticks(99)).then(function () {
                expect(result).toEqual([1, 'a']);
            }).then(clock.ticks(1)).then(function () {
                expect(result).toEqual([1, 'a', 'b']);
            }).then(clock.ticks(149)).then(function () {
                expect(result).toEqual([1, 'a', 'b']);
            }).then(clock.ticks(1)).then(function () {
                expect(result).toEqual([1, 'a', 'b', 2, 3]);
            }).then(clock.ticks(100)).then(function () {
                expect(result).toEqual([1, 'a', 'b', 2, 3, 4]);
            }).then(clock.ticks(49)).then(function () {
                expect(result).toEqual([1, 'a', 'b', 2, 3, 4]);
            }).then(clock.ticks(1)).then(function () {
                expect(result).toEqual([1, 'a', 'b', 2, 3, 4, 'c']);
            }).then(function () {
                clock.uninstall();
                done();
            });
        });

        it('enqueues interval timers when they fire', function (done) {
            var result = [];

            clock.install();

            var a = setInterval(function () {
                result.push(1);
            }, 500);
            var b = setInterval(function () {
                result.push(2);
            }, 250);

            expect(result).toEqual([]);
            clock.tick(249).then(function () {
                expect(result).toEqual([]);
            }).then(clock.ticks(1)).then(function () {
                expect(result).toEqual([2]);
            }).then(clock.ticks(250)).then(function () {
                expect(result).toEqual([2,1,2]);
            }).then(clock.ticks(250)).then(function () {
                expect(result).toEqual([2,1,2,2]);
            }).then(clock.ticks(250)).then(function () {
                expect(result).toEqual([2,1,2,2,1,2]);
                clearTimeout(b);
            }).then(clock.ticks(250)).then(function () {
                expect(result).toEqual([2,1,2,2,1,2]);
            }).then(clock.ticks(250)).then(function () {
                expect(result).toEqual([2,1,2,2,1,2,1]);
            }).then(function () {
                clock.uninstall();
                done();
            });
        });
    });

    describe('date', function () {
        it('behaves normally except for current time', function (done) {
            clock.install();
            clock.setTime(1494845464212);

            expect(new Date().getTime()).toEqual(1494845464212);

            clock.tick(5000).then(function () {
                expect(new Date().getTime()).toEqual(1494845469212);
                clock.uninstall();
                done();
            });
        });
    });
});
