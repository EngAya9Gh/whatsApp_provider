require('dotenv').config();
const mongoose = require('mongoose');
async function run() {
  try {
    const uri = process.env.MONGO_URI;
    console.log("URI:", uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected!");
    process.exit(0);
  } catch (err) {
    console.error("MONGO ERROR:", err);
    process.exit(1);
  }
}
run();
