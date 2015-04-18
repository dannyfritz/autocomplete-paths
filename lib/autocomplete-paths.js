'use babel';

var provider = require('./paths-provider')

module.exports = {
    activate () {
        return true;
    },
    getProvider() {
        return provider;
    }
}
