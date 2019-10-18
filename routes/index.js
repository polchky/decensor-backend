const compose = require('koa-compose');
const auth = require('./auth');

const channels = require('./channels');
const regions = require('./regions');
const subscriptions = require('./subscriptions');
const users = require('./users');
const videos = require('./videos');

const aggregator = () => {
    const middleware = [];
    const routers = [
        auth,
        channels,
        regions,
        subscriptions,
        users,
        videos,
    ];

    for (let i = 0; i < routers.length; i += 1) {
        middleware.push(routers[i].routes());
        middleware.push(routers[i].allowedMethods());
    }

    return compose(middleware);
};

module.exports = aggregator;
