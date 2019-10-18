const { User } = require('../models');


const controller = {
    read: async (ctx) => {
        ctx.body = await User.findByIdAndUpdate(
            ctx.userId,
            { _id: ctx.userId },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )
            .select({ __v: false, created: false, subscriptions: false })
            .lean();
    },


};

module.exports = controller;
