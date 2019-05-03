const Mongoose = require('mongoose');

const subscriptionSchema = new Mongoose.Schema({
    channelId: String,
});

const schema = new Mongoose.Schema({
    _id: { type: String, required: true },
    subscriptions: [subscriptionSchema],
    region: { type: String, ref: 'Region' },
    created: { type: Date, default: Date.now },
    checked: Date,
});

Mongoose.model('User', schema);

module.exports = Mongoose.model('User');
