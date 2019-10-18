const logger = require('../logging').getLogger();
const constants = require('../constants');
const helpers = require('./helpers');
const error = require('./error');

const batchEvalAndCheck = async (
    method,
    batchSize = constants.youtubeApi.maxResults * constants.youtubeApi.concurrentRequests
) => {
    let ret = error.OK;
    while (ret === error.OK) {
        /* eslint-disable-next-line no-await-in-loop */
        ret = await method(batchSize);
    }
    return ret;
};

const crawlers = {
    discovery: async () => {
        const max = constants.youtubeApi.maxResults * constants.youtubeApi.concurrentRequests;
        let err = error.OK;
        /* eslint-disable no-await-in-loop */
        do {
            // Check missing channels info
            err = await helpers.channels.getNextChannelsStats();
            if (err === error.OK) {
                // Discover new channels
                err = await helpers.subscriptions
                    .getNextSubscriptions(max);
            }
        } while (err === error.OK);
        /* eslint-enable no-await-in-loop */

        logger.info('Discovery crawler finished.');
    },

    maintenance: async () => {
        let ret;
        /**
         * Get stats for newly indexed channels
        */
        ret = await batchEvalAndCheck(helpers.channels.getNextChannelsStats);
        if (ret === error.QUOTA_DEPLETED) return ret;

        /**
         * Update existing channels.
         * Check if checked channels are still checkable.
         */
        ret = await batchEvalAndCheck(helpers.channels.updateNextChannels);
        if (ret === error.QUOTA_DEPLETED) return ret;

        /**
         * Get uploads ID for newly checkable channels.
         */
        ret = await batchEvalAndCheck(helpers.channels.getNextUploadsIds);
        if (ret === error.QUOTA_DEPLETED) return ret;

        /**
         * Get new videos IDs.
         */
        ret = await batchEvalAndCheck(
            helpers.playlistItems.getNextVideosIds,
            constants.youtubeApi.concurrentRequests
        );
        if (ret === error.QUOTA_DEPLETED) return ret;

        /**
         * Check (new and old) videos for channels not updated recently.
         * Mark the videos and the channel as checked.
         */
        ret = await batchEvalAndCheck(helpers.videos.updateNextVideos);
        if (ret === error.QUOTA_DEPLETED) return ret;

        /**
         * Check new, unchecked videos of all non updated channels.
         * Mark the videos as checked.
         */
        ret = await batchEvalAndCheck(helpers.videos.getNextVideos);
        if (ret === error.QUOTA_DEPLETED) return ret;

        return error.OK;
    },
};

module.exports = crawlers;
