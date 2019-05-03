const authenticate = require('./authenticate');
const jwt = require('./jwt');


const middlewares = {
    authenticate,
    jwt,
};

module.exports = middlewares;
