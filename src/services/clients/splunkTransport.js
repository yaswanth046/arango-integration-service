const SplunkLogger = require('winston-splunk-httplogger');
const config = require('../../config/index');

const createSplunkTransport = () => {
  let splunkTransport = null;
  try {
    splunkTransport = new SplunkLogger({
      splunk: {
        token: config.splunk.token,
        url: config.splunk.url,
        index: config.splunk.index,
        source: config.splunk.source,
        sourcetype: config.splunk.sourcetype,
        insecureSSL: true,
      },
      level: config.splunk.level || 'info',
    });

    splunkTransport.on('error', (err) => {
      console.log({
        level: 'error',
        message: 'Splunk Transport Error',
        meta: { error: err.message }
      });
    });

    splunkTransport.on('logged', () => {
      console.log({
        level: 'info',
        message: 'Splunk Transport Success',
      });
    });

    console.log({
      level: 'info',
      message: 'Splunk Transport Initialized Successfully'
    });
  } catch (err) {
    console.log({
      level: 'error',
      message: 'Splunk Transport Init Failed',
      meta: { error: err.message }
    });
    splunkTransport = null;
  }
  return splunkTransport;
};

module.exports = createSplunkTransport;