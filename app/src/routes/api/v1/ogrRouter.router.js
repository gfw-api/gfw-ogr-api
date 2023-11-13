const Router = require('koa-router');
const logger = require('logger');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const fs = require('fs');
const util = require('util');
const OGRConverter = require('services/converter');


const router = new Router({
    prefix: '/ogr'
});

class OgrRouterRouter {

    static async convert(ctx) {
        // logger.debug('Converting file...', ctx.request.body);

        ctx.assert(ctx.request.files && ctx.request.files.file, 400, 'File required');

        try {
            const result = await OGRConverter.convert(ctx)
            ctx.body = GeoJSONSerializer.serialize(result['data']);  
            // logger.debug(result);
        } catch (e) {
            logger.error('Error convert file', e);
            ctx.throw(400, e.message.split('\n')[0]);
        } finally {
            logger.debug('Removing file');
            const unlink = util.promisify(fs.unlink);
            unlink(ctx.request.files.file.filepath);
        }
    }

}

router.post('/convert', OgrRouterRouter.convert);

module.exports = router;
