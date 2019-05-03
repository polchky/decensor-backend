const Router = require('koa-router');
const { regions } = require('../controllers');
const jwt = require('../middlewares/jwt');

const router = new Router();
router
    .get('/regions/', jwt, regions.list);

module.exports = router;
