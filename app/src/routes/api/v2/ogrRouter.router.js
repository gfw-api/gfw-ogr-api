const Router = require('koa-router');
const logger = require('logger');
const util = require('util');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const fs = require('fs');
const mapshaper = require('mapshaper');
const OGRConverter = require('services/converter');

const router = new Router({
    prefix: '/ogr'
});

class OGRRouterV2 {

    static async convertV2(ctx) {
        logger.info('Converting file...', ctx.request.body);
        logger.debug(`[OGRRouterV2 - convertV2] request: ${JSON.stringify(ctx.request)}`);
        ctx.assert(ctx.request.files && ctx.request.files.file, 400, 'File required');
        logger.debug(`[OGRRouterV2 - convertV2] file data: ${JSON.stringify(ctx.request.files.file)}`);

        const simplify = ctx.query.simplify || null;
        const clean = ctx.query.clean || false;

        const simplifyCmd = simplify ? `-simplify visvalingam percentage=${simplify}% keep-shapes ` : '';
        const cleanCmd = clean && Boolean(clean) ? '-clean ' : '';

        try {
            const result = await OGRConverter.convert(ctx)

            // Mapshaper input stream from file
            const input = { 'input.json': result['data'] };
            const cmd = `-i no-topology input.json ${simplifyCmd}${cleanCmd} -each '__id=$.id' -o output.json`;
            logger.info('[OGRRouterV2 - convertV2] cmd:');
            logger.info(cmd);
            const resultPostMapshaper = await mapshaper.applyCommands(cmd, input);
            ctx.body = GeoJSONSerializer.serialize(JSON.parse(resultPostMapshaper['output.json']));

        } catch (e) {
            logger.error('[OGRRouterV2 - convertV2] Error convertV2 file', e);
            ctx.throw(400, e.message.split('\n')[0]);
        } finally {
            logger.debug('[OGRRouterV2 - convertV2] Removing file');
            const unlink = util.promisify(fs.unlink);
            await unlink(ctx.request.files.file.filepath);
        }
    }

}

router.post('/convert', OGRRouterV2.convertV2);


module.exports = router;
