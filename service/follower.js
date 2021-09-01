const {Follower} = require("../model/follower");

async function addFollower(data) {
    return Follower.updateOne(
        {rest_id: data.rest_id},
        data,
        {upsert: true}
    );
}

module.exports = {
    addFollower
}