const sourceTypes = ['mysql', 'postgres', 'mongodb'];
const DB_TYPES = {
  MYSQL: 'mysql',
  POSTGRES: 'postgres',
  MONGODB: 'mongodb'
};

const mongoDbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000
};

module.exports = {
  sourceTypes,
  DB_TYPES,
  mongoDbOptions
};