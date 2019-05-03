const Router = require('koa-router');
const jwt = require('../middlewares/jwt');
const { auth, subscriptions } = require('../controllers');

const router = new Router();
router
    .param('userId', jwt, auth.authenticate)
    .get('users/:userId/subscriptions/', subscriptions.readByUser)
    .put('users/:userId/subscriptions/', subscriptions.updateByUser);

module.exports = router;
