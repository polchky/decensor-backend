const Router = require('koa-router');
const { videos } = require('../controllers');

const router = new Router();
router
    .get('/channels/:channelId/videos/', videos.listByChannel);

module.exports = router;
