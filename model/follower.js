const mongoose = require('mongoose');


const {Schema} = mongoose;

const followerSchema = new Schema({
        rest_id: {
            type: String,
            index: true,
            required: true,
            unique: true
        }
    },
    {strict: false}
);

const Follower = mongoose.model('Follower', followerSchema);

module.exports = {
    Follower
}