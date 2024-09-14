const mongoose = require("mongoose");


const connectDb = () => {
    try {
        mongoose.connect(process.env.CONNECTION_STRING)
            .then(() => {
                console.log(
                    "Database connected");
            })
            .catch((err) => {
                console.log(err)
            })


    } catch (err) {
        console.log(err);
        process.exit(1);
    }
};

module.exports = connectDb;