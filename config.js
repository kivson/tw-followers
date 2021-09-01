const {connect} = require("mongoose");


async function connectDB(databaseName) {
    return connect(`mongodb://localhost:27017/${databaseName}`, {useNewUrlParser: true});
}
module.exports ={
    connectDB
}