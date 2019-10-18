const Router = require('koa-router');
const { authenticate, jwt } = require('../middlewares');
const { channels, subscriptions } = require('../controllers');

const router = new Router();
/*
router
    .post('/subscriptions/', channels.listBySubscriptions);
    .param('userId', authenticate)
    .get('/users/:userId/subscriptions/', jwt, subscriptions.readByUser)
    .put('/users/:userId/subscriptions/', jwt, subscriptions.updateByUser);
    */

module.exports = router;
