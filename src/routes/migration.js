const express = require('express');
const router = express.Router();

const migrationController = require('../controllers/migrationController');
const commonController = require('../controllers/commonMethodController');

router.route('/')
  .post(migrationController.handleMigration)
  .all(commonController.notFoundHandler);

module.exports = router;