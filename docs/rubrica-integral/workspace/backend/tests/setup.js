require("dotenv").config();

process.env.NODE_ENV = "test";
process.env.DB_NAME = "la_morada_test";
process.env.MAIL_MODE = "console";
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-secret";
process.env.JWT_ACCESS_EXPIRES = "3600";
process.env.JWT_ONE_DAY_EXPIRES = "600";

const mongoose = require("mongoose");
const connectMongo = require("../src/config/mongo-config");
const redisClient = require("../src/config/redis-config");

beforeAll(async () => {
  await connectMongo();
  await redisClient.connectIfNeeded();
});

beforeEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  await redisClient.flushDb();
});

afterAll(async () => {
  await mongoose.disconnect();
  await redisClient.disconnectIfNeeded();
});