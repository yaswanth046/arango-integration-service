const { logger } = require('../middlewares/loggerMiddleware');
const { migrate } = require('../services/migrationService');
const { validateDataSourceParams } = require('../utils/validator');

const handleMigration = async (req, res, next) => {
  try {
    const sourceDbDetails = req.body;
    logger.log({
      level: 'info',
      message: 'migrationController - handleMigration - input',
      meta: { reqBody: sourceDbDetails }
    });

    const { error } = validateDataSourceParams(sourceDbDetails);
    if (error) {
      logger.log({
        level: 'error',
        message: 'migrationController - handleMigration - validation error',
        meta: { message: error.message }
      });
      throw error;
    }
    await migrate(sourceDbDetails);
    res.json({ message: 'Migration successful' });
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'migrationController - handleMigration - error',
      meta: { message: error.message }
    });
    next(error);
  }
};

module.exports = { handleMigration };