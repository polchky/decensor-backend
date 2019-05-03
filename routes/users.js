const Router = require('koa-router');
const { authenticate, jwt } = require('../middlewares');
const { users } = require('../controllers');

const router = new Router();

router
    .param('userId', authenticate)
    .get('/users/:userId', jwt, users.read);

module.exports = router;
