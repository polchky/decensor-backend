
const auth = async (id, ctx, next) => {
    ctx.userId = id;
    return next();
};

module.exports = auth;
