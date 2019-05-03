
const auth = async (id, ctx, next) => {
    ctx.auth = { sub: id };
    return next();
};

module.exports = auth;
