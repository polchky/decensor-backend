const Mongoose = require('mongoose');
const Pino = require('pino');
const Region = require('./models/region');
const logger = require('./logging')({}, Pino.destination(`./logs/${new Date().toISOString()}.log`));
const constants = require('./constants');
const helpers = require('./youtube-api/helpers');
const error = require('./youtube-api/error');
const Channel = require('./models/channel');

Mongoose.connect(`mongodb://localhost:27017/${constants.db.name}`, constants.db.options);

const batchSize = constants.youtubeApi.concurrentRequests * constants.youtubeApi.maxResults;

const crawlers = {
    crawlChannelsInfo: async () => {
        try {
            let ret = error.OK;
            while (ret === error.OK) {
                /* eslint-disable-next-line no-await-in-loop */
                ret = await helpers.channels.getNextChannelsStats(batchSize);
            }
            logger.info('Crawling finised without error');
        } catch (err) {
            logger.warn(`Error in crawler: ${err}`);
        }
    },
    crawlVideosIds: async () => {
        try {
            let ret = error.OK;
            while (ret === error.OK) {
                /* eslint-disable-next-line no-await-in-loop */
                ret = await helpers.playlistItems.getNextVideosIds(
                    constants.youtubeApi.concurrentRequests
                );
            }
            logger.info('Crawling videos IDs finished without error');
        } catch (err) {
            logger.warn(`Error in videos IDs crawler: ${err}`);
        }
    },

    crawlVideos: async () => {
        try {
            let ret = error.OK;
            while (ret === error.OK) {
                /* eslint-disable-next-line no-await-in-loop */
                ret = await helpers.videos.getNextVideos(batchSize);
            }
            logger.info('Crawling videos finished without error');
        } catch (err) {
            logger.warn(`Error in videos crawler: ${err}`);
        }
    },
    setActiveBlockedRegions: async () => {
        let index = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            index += 1;
            // eslint-disable-next-line no-await-in-loop
            const channels = await Channel.find({ 'blocked.active': { $exists: false } }, { _id: true }).limit(100).lean();
            if (channels.length <= 0) break;
            // eslint-disable-next-line no-await-in-loop
            await helpers.channels.setChannelsBlockedRegions(channels.map((c) => c._id));
            logger.info(index);
        }
    },
};

const getRegions = async () => {
    const res = await Region.find();
    constants.regions = res.map((region) => region._id);
};

getRegions()
    .then(crawlers.crawlVideos)
    .then(crawlers.crawlVideosIds)
    .then(() => process.exit());
