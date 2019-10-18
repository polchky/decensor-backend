const Mongoose = require('mongoose');
const Pino = require('pino');
const logger = require('./logging')({}, Pino.destination(`./logs/${new Date().toISOString()}.log`));
const constants = require('./constants');
const helpers = require('./youtube-api/helpers');
const error = require('./youtube-api/error');

Mongoose.connect(`mongodb://localhost:27017/${constants.db.name}`, constants.db.options);

const batchSize = constants.youtubeApi.concurrentRequests * constants.youtubeApi.maxResults;

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

const crawlUploadsIds = async () => {
    try {
        let ret = error.OK;
        while (ret === error.OK) {
            /* eslint-disable-next-line no-await-in-loop */
            ret = await helpers.channels.getNextUploadsIds(batchSize);
        }
        logger.info('Crawling finished without error');
    } catch (err) {
        logger.warn(`Error in crawler: ${err}`);
    }
};

const crawlVideosIds = async () => {
    try {
        let ret = error.OK;
        let i = 0;
        while (ret === error.OK && i < 20) {
            i += 1;
            /* eslint-disable-next-line no-await-in-loop */
            ret = await helpers.playlistItems.getNextVideosIds(
                constants.youtubeApi.concurrentRequests
            );
        }
        logger.info('Crawling finished without error');
    } catch (err) {
        logger.warn(`Error in crawler: ${err}`);
    }
};

const crawlVideos = async () => {
    try {
        let ret = error.OK;
        while (ret === error.OK) {
            /* eslint-disable-next-line no-await-in-loop */
            ret = await helpers.videos.getNextVideos(batchSize);
        }
        logger.info('Crawling finished without error');
    } catch (err) {
        logger.warn(`Error in crawler: ${err}`);
    }
};

crawlVideosIds().then(crawlVideos).then(() => process.exit());
