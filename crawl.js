const Mongoose = require('mongoose');
const Region = require('./models/region');
const Pino = require('pino');
const logger = require('./logging')({}, Pino.destination(`./logs/${new Date().toISOString()}.log`));
const constants = require('./constants');
const helpers = require('./youtube-api/helpers');
const error = require('./youtube-api/error');

Mongoose.connect(`mongodb://localhost:27017/${constants.db.name}`, constants.db.options);

const batchSize = constants.youtubeApi.concurrentRequests * constants.youtubeApi.maxResults;

// Get regions

const crawlChannelsInfo = async () => {
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
};

const crawlVideosIds = async () => {
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
};

const crawlVideos = async () => {
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
};

const getRegions = async () => {
    const res = await Region.find();
    constants.regions = res.map((region) => region._id);
};

getRegions().then(crawlVideos).then(crawlVideosIds).then(() => process.exit());
