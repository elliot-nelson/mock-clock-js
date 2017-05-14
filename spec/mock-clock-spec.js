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
    });
});
