const mongoose = require('mongoose');
const Video = require('../../models/video');
const Channel = require('../../models/channel');
const Region = require('../../models/region');
const logger = require('../../logging/index').getLogger();
const error = require('../error');
const constants = require('../../constants');
const youtube = require('../client')();

const videosHelper = {

    insertVideo: async (channelId, video) => {
        try {
            return Video.updateOne(
                { _id: video.contentDetails.videoId },
                {
                    $setOnInsert: {
                        channelId,
                        status: constants.status.video.new,
                    },
                },
                { upsert: true }
            );
        } catch (err) {
            logger.warn(`problem while inserting video ${video} for channel Id ${channelId}: ${err}`);
            return error.UNKNOWN_ERROR;
        }
    },

    updateVideo: async (v) => {
        try {
            const status = constants.status.video;
            const set = {
                title: v.snippet.title,
                created: new Date(v.snippet.publishedAt),
                checked: new Date(),
            };
            const timeLimit = new Date();
            timeLimit.setDate(timeLimit.getDate() - constants.thresholds.daysToStablilizeVideos);
            const archived = set.created < timeLimit;
            set.status = archived ? status.archived : status.active;
            if (v.contentDetails) {
                const r = v.contentDetails.regionRestriction;
                if (r.allowed) set.allowed = r.allowed;
                if (r.blocked) set.blocked = r.blocked;
            }

            // Archived video is clear, remove it
            if (archived && !set.blocked && !set.allowed) {
                await Video.deleteOne({ _id: v.id });
            } else {
                await mongoose.connection.db.collection('videos').updateOne(
                    { _id: v.id },
                    [
                        { $unset: ['allowed', 'blocked'] },
                        { $set: set },
                    ],
                );
                // Update channel's blocked list for archived videos
                /**
                if (archived) {
                    let blocked;
                    if (set.blocked) {
                        ({ blocked } = set);
                    } else {
                        // let countries = await Region.find();
                        // countries = countries.map((region) => region._id);
                    }
                    await Channel.updateOne(
                        { _id: v.channelId },
                        { $addToSet: { '$blocked.archived': { $each: blocked } } }
                    );

                    await Channel.updateOne(
                        { _id: v.channelId },
                        { }
                    );
                }
                **/
            }
        } catch (err) {
            logger.warn(`Error while updating video ${v.id}: ${err}`);
        }
    },

    getVideosInfo: async (videosIds, parts, fields, inserter) => {
        const dict = {};
        for (let i = 0; i < videosIds.length; i += 1) {
            dict[videosIds[i]] = true;
        }
        try {
            const res = await youtube.videos.list({
                prettyPrint: false,
                part: parts,
                fields,
                maxResults: constants.youtubeApi.maxResults,
                id: videosIds.join(','),
            });
            const videos = res.data.items;
            const promises = [];
            // Insert each video
            for (let i = 0; i < videos.length; i += 1) {
                promises.push(inserter(videos[i]).then(
                    () => { delete dict[videos[i].id]; }
                ));
            }
            await Promise.all(promises);
            // Update unreachable videos
            await Video.updateMany(
                { _id: { $in: Object.keys(dict) } },
                {
                    $set: {
                        checked: new Date(),
                        status: constants.status.video.unreachable,
                    },
                }
            );
            // Signal unreachable videos (TODO: remove?)
            for (let i = 0; i < Object.keys(dict); i += 1) {
                logger.warn(`Could not find info about video ${Object.keys(dict)[i]}`);
            }
            return error.OK;
        } catch (err) {
            if (!error.hasQuota(err)) {
                return error.QUOTA_DEPLETED;
            }
            logger.warn(`Error while getting videos info: ${err}`);
            return error.UNKNOWN_ERROR;
        }
    },

    getVideosBatch: async (videosIds, channelsIds = []) => {
        const now = new Date();
        const res = await videosHelper.getVideosInfo(
            videosIds,
            'snippet,contentDetails',
            'items(id,snippet(channelId,publishedAt,title),contentDetails/regionRestriction(allowed,blocked))',
            videosHelper.updateVideo
        );
        if (res !== error.OK) return res;

        try {
            // Update channels
            await Channel.updateMany(
                { _id: { $in: channelsIds } },
                { $set: { videosChecked: now } }
            );
            return error.OK;
        } catch (err) {
            logger.warn(`Error while getting videos batch for videos ${videosIds} (channels not marked as checked): ${err}`);
            return error.UNKNOWN_ERROR;
        }
    },

    updateNextVideos: async (
        limitChannels = 0,
        freq = constants.thresholds.daysBetweenVideosChecks
    ) => {
        const { status } = constants.status.video;
        const until = new Date();
        until.setDate(until.getDate() - freq);

        // Retrieve channels to check
        const stages = [
            {
                $match: {
                    status: constants.status.channel.active,
                    videosChecked: { $not: { $gt: until } },
                },
            },
            { $sort: { videosChecked: 1 } },
            {
                $lookup: {
                    from: 'videos',
                    let: { channelId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$channelId', '$$channelId'] },
                                status: { $in: [status.new, status.active] },
                            },
                        },
                        { $project: { _id: true } },
                    ],
                    as: 'videos',
                },
            },
            { $project: { videos: true } },
        ];
        if (limitChannels) stages.push({ limit: limitChannels });

        const channels = await Channel.aggregate(stages);
        if (channels.length === 0) return error.EMPTY_LIST;

        // Group videos in batches
        const promises = [];
        while (channels.length > 0) {
            const videos = [];
            const clearedChannels = [];
            let remaining = constants.youtubeApi.maxResults;
            while (channels.length > 0 && remaining > 0) {
                if (channels[0].videos.length > remaining) {
                    videos.push(...channels[0].videos.splice(0, remaining));
                } else {
                    videos.push(...channels[0].videos);
                    clearedChannels.push(channels.splice(0, 1)[0]._id);
                }
                remaining = constants.youtubeApi.maxResults - videos.length;
            }
            promises.push(videosHelper.getVideosBatch(videos, clearedChannels));
        }
        return error.checkPromises(promises, 'updating next videos');
    },

    getNextVideos: async (limitVideos = 0) => {
        const videos = await Video.find({ status: constants.status.video.new }).limit(limitVideos);
        if (videos.length === 0) return error.EMPTY_LIST;
        const videosIds = videos.map((v) => v._id);
        const promises = [];
        while (videosIds.length > 0) {
            promises.push(
                videosHelper.getVideosBatch(videosIds.splice(0, constants.youtubeApi.maxResults))
            );
        }
        return error.checkPromises(promises, 'getting next videos');
    },

};

module.exports = videosHelper;
