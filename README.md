# mock-clock-js

An asynchronous mock clock library for javascript unit testing.

## Installation

    npm install mock-clock --save-dev

## Usage

This library allows you to mock the clock in your Javascript unit tests, giving
you more control over the value of the current time and the behavior of timers.

Unlike other implementations, ticking the clock is always an async operation. When
testing code that mixes Promises and timer behavior, it can be difficult (and
potentially undesirable) to truly flatten all behavior into a synchronous path.

Let's jump into an example...

    var clock = require('mock-clock');

    describe('my tests', function () {
        beforeEach(clock.install);
        afterEach(clock.uninstall);

        it('runs something every 500ms', function (done) {
            var frames = [];
            setInterval(function () {
                frames.push(true);
            }, 500);

            expect(frames).toEqual([]);
            clock.tick(499).then(function () {
                expect(frames).toEqual([]);
                return clock.tick(1);
            }).then(function () {
                expect(frames).toEqual([true]);
            }).then(clock.ticks(500)).then(function () {
                expect(frames).toEqual([true, true]);
                done();
            });
        });
    });

### API

WIP

## License

Licensed under MIT. [Full license here &raquo;](LICENSE)

## Contributing

Pull requests are welcome. Make sure to include tests for any new or modified
functionality.

Feature requests and issue reports are also welcome. When reporting an issue be
sure to include operating system, node version, and any other information
required to reproduce the problem.

