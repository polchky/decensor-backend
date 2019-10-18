const Channel = require('../../models/channel');
const logger = require('../../logging/index').getLogger();
const error = require('../error');
const constants = require('../../constants');
const channelsHelper = require('./channels');

const youtube = require('../client')();

const subscriptionsHelper = {

    getChannelSubscriptions: async (channelId) => {
        let ret;
        try {
            const promises = [];
            let pageToken = '';
            let now;
            while (pageToken !== undefined) {
                now = new Date();
                /* eslint-disable-next-line no-await-in-loop */
                const res = await youtube.subscriptions.list({
                    prettyPrint: false,
                    part: 'snippet',
                    fields: 'nextPageToken,items/snippet/resourceId/channelId',
                    maxResults: constants.youtubeApi.maxResults,
                    pageToken,
                    channelId,
                });
                pageToken = res.data.nextPageToken;
                for (let i = 0; i < res.data.items.length; i += 1) {
                    promises.push(channelsHelper.insertChannel(
                        res.data.items[i].snippet.resourceId.channelId,
                        now
                    ));
                }
            }
            await Promise.all(promises);
            ret = error.OK;
        } catch (err) {
            if (!error.hasQuota(err)) {
                return error.QUOTA_DEPLETED;
            }
            if (!(err.errors && err.errors[0].reason !== 'subscriptionForbidden')) {
                logger.warn(`unknown error while getting subscriptions (channel marked as checked): ${err}`);
            }
            ret = error.UNKNOWN_ERROR;
        }
        // Mark the channel as checked
        await Channel.updateOne(
            { _id: channelId },
            { $set: { subsChecked: new Date() } }
        );
        return ret;
    },

    getNextSubscriptions: async (limitChannels = 0) => {
        // Fetch channels to check
        const toCheck = await Channel
            .find({
                subsChecked: { $exists: false },
                subs: { $gte: constants.thresholds.subsToGetSubs },
            })
            .select('_id')
            .sort({ subs: 1 })
            .limit(limitChannels)
            .lean();

        // Dead end
        if (toCheck.length === 0) {
            logger.warn('Out of channels to get stats from!');
            return error.EMPTY_LIST;
        }

        // Check channels
        // Get channels subscriptions
        const promises = [];
        for (let i = 0; i < toCheck.length; i += 1) {
            promises.push(subscriptionsHelper.getChannelSubscriptions(toCheck[i]._id));
        }
        return error.checkPromises(promises, 'getting next subscriptions');
    },
};

module.exports = subscriptionsHelper;
