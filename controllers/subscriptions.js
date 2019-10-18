const { User } = require('../models');

const controller = {
    readByUser: async (ctx) => {
        try {
            ctx.body = await User
                .findById(ctx.userId)
                .select({ subscriptions: true, _id: false })
                .lean();
        } catch (err) {
            ctx.response.status = 400;
        }
    },

    updateByUser: async (ctx) => {
        try {
            await User.Update(
                { _id: ctx.userId },
                { $set: { subscriptions: ctx.request.body } }
            );
            ctx.response.status = 204;
        } catch (err) {
            ctx.response.status = 400;
        }
    },
};

module.exports = controller;
