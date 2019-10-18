const { Channel, Video } = require('../models');

const controller = {
    listByChannel: async (ctx) => {
        const { country } = ctx.query;
        if (!country) ctx.throw(400, 'country code required');

        // Look for country either in blocked or not in allowed
        const filters = {
            channelId: ctx.params.channelId,
            $or: [
                { blocked: country },
                { allowed: { $exists: true, $ne: country } },
            ],
        };

        ctx.body = await Video
            .find(filters)
            .select({ __v: false })
            .lean();

        // Insert channel if missing, but send response directly
        /*
        Channel.updateOne(
            { _id: ctx.params.channelId },
            { _id: ctx.params.channelId },
            { upsert: true, setDefaultsOnInsert: true },
        ).lean();
        */
    },
};

module.exports = controller;
