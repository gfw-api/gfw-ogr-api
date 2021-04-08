const Router = require('koa-router');
const logger = require('logger');
const ogr2ogr = require('ogr2ogr');
const XLSX = require('xlsx');
const util = require('util');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const fs = require('fs');
const path = require('path');
const mapshaper = require('mapshaper');

const router = new Router({
    prefix: '/ogr'
});

class OGRRouterV2 {

    static async convertV2(ctx) {
        logger.info('Converting file...', ctx.request.body);

        ctx.assert(ctx.request.files && ctx.request.files.file, 400, 'File required');
        const simplify = ctx.query.simplify || null;
        const clean = ctx.query.clean || false;

        const simplifyCmd = simplify ? `-simplify visvalingam percentage=${simplify}% keep-shapes ` : '';
        const cleanCmd = clean && Boolean(clean) ? '-clean ' : '';

        try {
            let ogr;

            if (ctx.request.files.file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                logger.debug('It is an excel file');
                const xslxFile = XLSX.readFile(ctx.request.files.file.path);
                const csvPAth = path.parse(ctx.request.files.file.path);
                csvPAth.ext = '.csv';
                csvPAth.base = csvPAth.name + csvPAth.ext;
                XLSX.writeFile(xslxFile, path.format(csvPAth), { type: 'file', bookType: 'csv' });
                ctx.request.files.file.path = path.format(csvPAth);
                // logger.debug(buf);
                ogr = ogr2ogr(ctx.request.files.file.path);
                ogr.project('EPSG:4326')
                    .timeout(60000); // increase default ogr timeout of 15 seconds to match control-tower
                ogr.options(['-oo', 'GEOM_POSSIBLE_NAMES=*geom*', '-oo', 'HEADERS=AUTO', '-oo', 'X_POSSIBLE_NAMES=Lon*', '-oo', 'Y_POSSIBLE_NAMES=Lat*', '-oo', 'KEEP_GEOM_COLUMNS=NO']);
            } else {
                ogr = ogr2ogr(ctx.request.files.file.path);
                ogr.project('EPSG:4326')
                    .timeout(60000); // increase default ogr timeout of 15 seconds to match control-tower

                if (ctx.request.files.file.type === 'text/csv' || ctx.request.files.file.type === 'application/vnd.ms-excel') {
                    logger.debug('csv transforming ...');
                    // @TODO
                    ogr.options(['-oo', 'GEOM_POSSIBLE_NAMES=*geom*', '-oo', 'HEADERS=AUTO', '-oo', 'X_POSSIBLE_NAMES=Lon*', '-oo', 'Y_POSSIBLE_NAMES=Lat*', '-oo', 'KEEP_GEOM_COLUMNS=NO']);
                } else {
                    ogr.options(['-dim', '2']);
                }

            }
            // ogr output
            const result = await ogr.promise();


            // Mapshaper input stream from file
            const input = { 'input.json': result };
            const cmd = `-i no-topology input.json ${simplifyCmd}${cleanCmd} -each '__id=$.id' -o output.json`;
            logger.info(cmd);
            const resultPostMapshaper = await mapshaper.applyCommands(cmd, input);
            ctx.body = GeoJSONSerializer.serialize(JSON.parse(resultPostMapshaper['output.json']));

        } catch (e) {
            logger.error('Error convertV2 file', e);
            ctx.throw(400, e.message.split('\n')[0]);
        } finally {
            logger.debug('Removing file');
            const unlink = util.promisify(fs.unlink);
            await unlink(ctx.request.files.file.path);
        }
    }

}

router.post('/convert', OGRRouterV2.convertV2);


module.exports = router;
