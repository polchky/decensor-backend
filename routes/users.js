const Router = require('koa-router');
const jwt = require('../middlewares/jwt');
const { auth } = require('../controllers');

const router = new Router();
router
    .param('userId', jwt, auth.authenticate);

module.exports = router;
