const express = require('express');
const { reqLoggerMiddleware } = require('./middlewares/loggerMiddleware');
const errorMiddleware = require('./middlewares/errorMiddleware');
const routes = require('./routes');
const arena = require('./ui/arena');

const app = express();

app.use(reqLoggerMiddleware);
app.use(express.json());

// Starting Worker
require('./jobs/bookingWorker');

app.use('/', routes);

app.use(errorMiddleware);

app.use('/', arena);

module.exports = app;
