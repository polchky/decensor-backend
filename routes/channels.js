const Router = require('koa-router');
const { channels } = require('../controllers');

const router = new Router();

router
    .get('/channels/', channels.listByIds)
    .put('/channels/:channelId', channels.update);

module.exports = router;
