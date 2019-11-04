const Mongoose = require('mongoose');

const blockedSchema = new Mongoose.Schema({
    archived: [String],
    active: [String],
});

/* eslint-disable no-multi-spaces */
const channelSchema = new Mongoose.Schema({
    _id: { type: String, required: true },  // Youtube ID
    title: String,
    thumbnail: String,
    country: String,
    views: Number,
    subs: Number,
    videos: Number,
    status: String,
    created: Date,                          // Date of channel creation
    indexed: Date,                          // Date of first referencing
    checked: Date,                          // Date of last check of channel stats
    videosChecked: Date,                    // Date of last check of videos
    playlistItemsChecked: Date,             // Date of last retrieval of new videos IDs
    blocked: blockedSchema,                 // Country codes of blocked videos in channel
});
/* eslint-enable no-multi-spaces */

Mongoose.model('Channel', channelSchema);

module.exports = Mongoose.model('Channel');
