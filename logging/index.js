const pino = require('pino');

let logger;

const logging = (options, destination) => {
    if (logger === undefined) logger = pino(options, destination);
    return logger;
};

logging.getLogger = () => logger;

module.exports = logging;
