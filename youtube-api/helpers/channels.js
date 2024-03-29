const Channel = require('../../models/channel');
const Video = require('../../models/video');
const logger = require('../../logging').getLogger();
const error = require('../error');
const constants = require('../../constants');

const youtube = require('../client')();

const channelsHelper = {

    insertChannel: async (channelId) => {
        try {
            await Channel.updateOne(
                { _id: channelId },
                {
                    $setOnInsert: {
                        _id: channelId,
                        indexed: new Date(),
                        status: constants.status.channel.new,
                    },
                },
                { upsert: true },
            ).lean();
        } catch (err) {
            logger.warn(`Error while indexing channel ${channelId}: ${err}`);
        }
    },

    determineChannelStatus: (channel) => {
        const status = constants.status.channel;

        // Unavailable stats
        if (!channel.subs || !channel.videos || !channel.created) return status.private;

        // Not enough subscribers
        if (channel.subs < constants.thresholds.subsToGetUploads) return status.small;

        // Too high videos frequency
        const diffMillis = channel.checked.getTime() - channel.created.getTime();
        const diffDays = diffMillis / (1000 * 3600 * 24);
        const freq = channel.videos / diffDays;
        if (freq > constants.thresholds.vidsPerDayToGetUploads) return status.spam;

        // Greenlight channel
        return status.active;
    },

    updateChannelStats: async (channel) => {
        try {
            const { url } = channel.snippet.thumbnails.default;
            const delimiterIndex = url.indexOf(constants.thumbnail.delimiter);
            if (!url.startsWith(constants.thumbnail.prefix) || delimiterIndex === -1) {
                logger.error(`Found a strange thumbnail url for channel ${channel.id} (skipping channel): ${channel.snippet.thumbnails.default.url}`);
            } else {
                const doc = await Channel.findById(channel.id);
                const set = {
                    title: channel.snippet.title,
                    created: channel.snippet.publishedAt,
                    thumbnail: url.slice(constants.thumbnail.prefix.length, delimiterIndex),
                    views: channel.statistics.viewCount,
                    subs: channel.statistics.subscriberCount,
                    videos: channel.statistics.videoCount,
                    country: channel.snippet.country,
                    checked: new Date(),
                };
                Object.assign(doc, set);
                doc.status = channelsHelper.determineChannelStatus(doc);
                await doc.save();
            }
        } catch (err) {
            logger.warn(`Error while updating stats for channel ${channel.id}: ${err}`);
        }
    },

    getChannelsInfo: async (channelsIds, parts, fields, inserter) => {
        const dict = {};
        let channels;
        for (let i = 0; i < channelsIds.length; i += 1) {
            dict[channelsIds[i]] = true;
        }
        try {
            const res = await youtube.channels.list({
                prettyPrint: false,
                part: parts,
                fields,
                maxResults: constants.youtubeApi.maxResults,
                id: channelsIds.join(','),
            });
            channels = res.data.items;
            const promises = [];
            // Update each channel according to the inserter
            for (let i = 0; i < channels.length; i += 1) {
                promises.push(inserter(channels[i]).then(
                    () => { delete dict[channels[i].id]; }
                ));
            }
            await Promise.all(promises);
            // Update missing channels
            const ids = Object.keys(dict);
            const unreachedStatus = [
                constants.status.channel.new,
                constants.status.channel.unreached,
            ];
            // Update unreached channels
            await Channel.updateMany(
                { _id: { $in: ids }, status: { $in: unreachedStatus } },
                {
                    $set: {
                        checked: new Date(),
                        status: constants.status.channel.unreached,
                    },
                },
            );
            // Update unreachable channels
            await Channel.updateMany(
                { _id: { $in: ids }, status: { $nin: unreachedStatus } },
                {
                    $set: {
                        checked: new Date(),
                        status: constants.status.channel.unreachable,
                    },
                },
            );
            return error.OK;
        } catch (err) {
            if (!error.hasQuota(err)) {
                return error.QUOTA_DEPLETED;
            }
            logger.warn(`Error while getting channels info: ${err} (channels not marked as checked). channels: ${channels}`);
            return error.OK;
        }
    },

    getChannels: async (request, message) => {
        const channels = await request;
        if (channels.length === 0) return error.EMPTY_LIST;

        const ids = channels.map((channel) => channel._id);
        const promises = [];
        for (let i = 0; i < ids.length; i += constants.youtubeApi.maxResults) {
            promises.push(channelsHelper.getChannelsInfo(
                ids.slice(i, i + constants.youtubeApi.maxResults),
                'snippet,statistics',
                'items(id,snippet(title,publishedAt,thumbnails/default/url,country),statistics(viewCount,subscriberCount,videoCount))',
                channelsHelper.updateChannelStats
            ));
        }
        return error.checkPromises(promises, message);
    },

    getNextChannelsStats: async (limitChannels = 0) => {
        // get stats for new channels
        const request = Channel.find(
            { status: constants.status.channel.new },
            { _id: true }
        ).limit(limitChannels).lean();

        return channelsHelper.getChannels(request, 'getting next channels stats');
    },

    updateNextChannels: async (limitChannels = 0, status, frequency) => {
        // Select channels for update
        const request = Channel
            .find(
                { t: frequency }
            )
            .sort({ subs: -1 })
            .limit(limitChannels)
            .lean();
        return channelsHelper.getChannels(request, 'updating next channels');
    },

    setChannelActiveBlockedRegions: async (channelId) => {
        const { regions } = constants;
        const blocked = await Video.aggregate([
            { $match: { channelId, status: constants.status.video.active } },
            { $group: { _id: 0, blocked: { $addToSet: '$blocked' }, allowed: { $addToSet: '$allowed' } } },
            {
                $project: {
                    blocked: { $reduce: { input: '$blocked', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
                    allowed: { $reduce: { input: '$allowed', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
                },
            },
            {
                $project: {
                    blocked: {
                        $cond: {
                            if: { $eq: ['$allowed', []] },
                            then: '$blocked',
                            else: { $setUnion: ['$blocked', { $setDifference: [regions, '$allowed'] }] },
                        },
                    },
                },
            },
        ]);
        await Channel.updateOne(
            { _id: channelId },
            { $set: { 'blocked.active': blocked.length > 0 ? blocked[0].blocked : [] } }
        );
    },

    setChannelsActiveBlockedRegions: async (channelsIds) => {
        const promises = [];
        for (let i = 0; i < channelsIds.length; i += 1) {
            promises.push(channelsHelper.setChannelActiveBlockedRegions(channelsIds[i]));
        }
        return Promise.all(promises);
    },

};

module.exports = channelsHelper;
