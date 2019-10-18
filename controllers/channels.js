const { Channel } = require('../models');
const constants = require('../constants');

const controller = {
    listByIds: async (ctx) => {
        const { id, country } = ctx.request.query;
        if (!id) ctx.throw(400, 'channel ids required');
        const ids = id.split(',').slice(0, constants.decensorApi.maxResults);
        const project = {
            title: true,
            thumbnail: true,
            country: true,
            views: true,
            subs: true,
            videos: true,
            status: true,
        };
        if (country && country.length === 2) {
            project[`allowed.${country}`] = true;
            project[`blocked.${country}`] = true;
        }
        ctx.body = await Channel.find(
            { _id: { $in: ids } },
            project,
        ).lean();
    },

    update: async (ctx) => {
        const channel = await Channel.updateOne(
            { _id: ctx.params.channelId },
            {
                $setOnInsert: {
                    _id: ctx.params.channelId,
                    indexed: new Date(),
                    status: constants.status.channel.new,
                },
            },
            { upsert: true, new: true }
        );
        ctx.body = channel;
    },
};

module.exports = controller;
