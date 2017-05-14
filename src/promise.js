var library;

if (typeof Promise !== 'undefined') {
    library = Promise;
}

if (!library) {
    try {
        library = require('bluebird');
    } catch (e) { }
}

if (!library) {
    try {
        library = require('when').Promise;
    } catch (e) { }
}

if (!library) {
    throw new Error('mock-clock requires bluebird, when, or native Promise to be available');
}

module.exports = library;
