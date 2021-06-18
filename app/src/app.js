const config = require('config');
const logger = require('logger');
const path = require('path');
const Koa = require('koa');
const koaLogger = require('koa-logger');
const loader = require('loader');
const koaValidate = require('koa-validate');
const koaBody = require('koa-body');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');
const ErrorSerializer = require('serializers/errorSerializer');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

// instance of koa
const app = new Koa();

// if environment is dev then load koa-logger
if (process.env.NODE_ENV === 'dev') {
    logger.debug('Use logger');
    app.use(koaLogger());
}

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (inErr) {
        let error = inErr;
        logger.debug('Error handling - Error object: ', JSON.stringify(error));
        try {
            error = JSON.parse(inErr);
        } catch (e) {
            logger.debug('Could not parse error message - is it JSON?: ', inErr);
            error = inErr;
        }
        ctx.status = error.status || ctx.status || 500;
        if (ctx.status >= 500) {
            logger.error(error);
        } else {
            logger.info(error);
        }

        ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
        // if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
        //     ctx.body = 'Unexpected error';
        // }
        ctx.response.type = 'application/vnd.api+json';
    }
});

app.use(koaBody({
    multipart: true,
    formidable: {
        uploadDir: '/tmp',
        onFileBegin(name, file) {
            const folder = path.dirname(file.path);
            file.path = path.join(folder, file.name);
        }
    }
}));

// load custom validator
koaValidate(app);

app.use(koaSimpleHealthCheck());

app.use(RWAPIMicroservice.bootstrap({
    name: config.get('service.name'),
    info: require('../microservice/register.json'),
    swagger: require('../microservice/public-swagger.json'),
    logger,
    baseURL: process.env.CT_URL,
    url: process.env.LOCAL_URL,
    token: process.env.CT_TOKEN,
    fastlyEnabled: process.env.FASTLY_ENABLED,
    fastlyServiceId: process.env.FASTLY_SERVICEID,
    fastlyAPIKey: process.env.FASTLY_APIKEY
}));

// load routes
loader.loadRoutes(app);

const server = app.listen(process.env.PORT, () => {
    if (process.env.CT_REGISTER_MODE === 'auto') {
        RWAPIMicroservice.register().then(() => {
            logger.info('CT registration process started');
        }, (error) => {
            logger.error(error);
            process.exit(1);
        });
    }
});


logger.info(`Server started in port:${process.env.PORT}`);

module.exports = server;
