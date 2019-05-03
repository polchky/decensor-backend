const Mongoose = require('mongoose');

const schema = new Mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
});

Mongoose.model('Region', schema);

module.exports = Mongoose.model('Region');
