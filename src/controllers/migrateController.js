const { logger } = require('../middlewares/loggerMiddleware');
const migrationService = require('../services/migrationService');

const startMigration = async (req, res, next) => {
  try {
    const { pgConfig, schema } = req.body;
    // Input validation
    // validatePgConfig(pgConfig);
    // validateSchemaName(schema);
    const migrationResp = await migrationService.migrate(pgConfig, schema);
    logger.log({
      level: 'info',
      message: 'migrateController - startMigration - migrationResp',
      meta: { migrationResp }
    });

    res.json(migrationResp);
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'migrateController - startMigration - error',
      meta: { error: error.message }
    });
    next(error);
  }
};

module.exports = {
  startMigration
};