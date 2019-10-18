const logger = require('../logging').getLogger();

const error = {
    hasQuota: (err) => {
        try {
            if (
                err.response.status === 403
                && (err.errors[0].reason === 'quotaExceeded' || err.errors[0].reason === 'dailyLimitExceeded')
            ) {
                return false;
            }
            return true;
        } catch (ex) {
            return true;
        }
    },

    checkPromises: async (promises, message) => {
        const res = await Promise.all(promises);
        for (let i = 0; i < res.length; i += 1) {
            if (res[i] === error.QUOTA_DEPLETED) {
                logger.info(`Depleted quotas while ${message}.`);
                return error.QUOTA_DEPLETED;
            }
        }
        return error.OK;
    },

    OK: 0,
    QUOTA_DEPLETED: 1,
    UNKNOWN_ERROR: 2,
    EMPTY_LIST: 3,
};

module.exports = error;
