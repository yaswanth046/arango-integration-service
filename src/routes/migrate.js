const express = require('express');
const router = express.Router();

const migrateController = require('../controllers/migrateController');
const commonController = require('../controllers/commonMethodController');

router.route('/')
  .post(migrateController.startMigration)
  .all(commonController.notFoundHandler);

module.exports = router;