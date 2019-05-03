const KoaJwt = require('koa-jwt');

const jwt = async (ctx, next) => KoaJwt({
    secret: process.env.JWT_SECRET,
    subject: ctx.auth ? ctx.auth.sub : undefined,
})(ctx, next);


module.exports = jwt;
