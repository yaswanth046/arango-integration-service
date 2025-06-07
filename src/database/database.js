const { Database } = require('arangojs');
const config = require('../config');
const { app } = config.arango;

const db = new Database({
  url: app.url,
  databaseName: app.database,
  auth: {
    username: app.username,
    password: app.password
  }    
});

module.exports = db;
