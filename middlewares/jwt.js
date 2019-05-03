const KoaJwt = require('koa-jwt');

const jwt = KoaJwt({
    secret: process.env.JWT_SECRET,
});

jwt.sub = async (ctx, next) => KoaJwt({
    secret: process.env.JWT_SECRET,
    subject: ctx.auth.sub,
})(ctx, next);


module.exports = jwt;
