const logger = require('../../logging/index').getLogger();
const error = require('../error');
const constants = require('../../constants');
const { Channel } = require('../../models');
const videosHelper = require('./videos');

const youtube = require('../client')();

const playlistItemsHelper = {

    getChannelVideosIds: async (channel, since = 0) => {
        let pageToken = '';
        const promises = [];
        // Create early date to avoid skipping channels during next check
        const now = new Date();
        try {
            while (pageToken !== undefined) {
                /* eslint-disable-next-line no-await-in-loop */
                const res = await youtube.playlistItems.list({
                    prettyPrint: false,
                    part: 'contentDetails',
                    fields: 'nextPageToken,items(contentDetails(videoId,videoPublishedAt))',
                    maxResults: constants.youtubeApi.maxResults,
                    pageToken,
                    playlistId: channel.uploads,
                });
                pageToken = res.data.nextPageToken;
                const { items } = res.data;

                // Check elements' date and insert them
                for (let i = 0; i < items.length; i += 1) {
                    if (items[i].contentDetails.videoPublishedAt < since) {
                        pageToken = undefined;
                        break;
                    }
                    promises.push(videosHelper.insertVideo(channel._id, items[i]));
                }
            }

            await Promise.all(promises);

            // update check date
            await Channel.updateOne(
                { _id: channel._id },
                { $set: { playlistItemsChecked: now } }
            );
        } catch (err) {
            if (error.hasQuota(err)) {
                logger.warn(`Unknown error while getting videos ids for channel ${channel._id}: ${err}`);
                return error.UNKNOWN_ERROR;
            }
            return error.QUOTA_DEPLETED;
        }
        return error.OK;
    },

    getNextVideosIds: async (
        limitChannels = 0,
        freq = constants.thresholds.daysBetweenPlaylistItemsChecks
    ) => {
        const until = new Date();
        until.setDate(until.getDate() - freq);

        // Select channels for update
        const channels = await Channel
            .find(
                {
                    status: constants.status.channel.active,
                    playlistItemsChecked: { $not: { $gt: until } },
                },
                { uploads: true }
            )
            .sort({ playlistItemsChecked: 1 })
            .limit(limitChannels)
            .lean();
        if (channels.length === 0) return error.EMPTY_LIST;

        const promises = [];
        for (let i = 0; i < channels.length; i += 1) {
            const since = channels[i].playlistItemsChecked || 0;
            promises.push(playlistItemsHelper.getChannelVideosIds(channels[i], since));
        }

        return error.checkPromises(promises, 'getting videos IDs');
    },

};

module.exports = playlistItemsHelper;
