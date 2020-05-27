const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const CollectionSchema = new mongoose.Schema({
    title: { type: String, required: true, date: Date.now(), required: true },
})

module.exports = Collection = mongoose.model('collection', CollectionSchema);

