const Mongoose = require('mongoose');

/* eslint-disable no-multi-spaces */
const videoSchema = new Mongoose.Schema({
    _id: { type: String, required: true },
    channelId: { type: String, required: true, index: true },
    title: String,
    created: Date,
    checked: Date,
    status: String,
    allowed: {
        type: [String],
        default: undefined,
    },
    blocked: {
        type: [String],
        default: undefined,
    },
});
/* eslint-enable no-multi-spaces */

Mongoose.model('Video', videoSchema);

module.exports = Mongoose.model('Video');
