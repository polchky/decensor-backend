const { Region } = require('../models');

const controller = {
    list: async (ctx) => {
        ctx.body = await Region
            .find()
            .select({ __v: false })
            .sort({ name: 1 })
            .lean()
            .exec();
    },
};

module.exports = controller;
