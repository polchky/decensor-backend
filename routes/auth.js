const Router = require('koa-router');
const { auth } = require('../controllers');

const router = new Router();
router
    .post('/signin', auth.signIn);

module.exports = router;
