const Router = require('koa-router');
const logger = require('logger');
const ogr2ogr = require('ogr2ogr').default;
const XLSX = require('xlsx');
const util = require('util');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const fs = require('fs');
const path = require('path');
const mapshaper = require('mapshaper');
const unzipper = require('unzipper');

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
            let result;
            logger.info(`[OGRRouterV2 - convertV2] file type: ${ctx.request.files.file.type}`);
            logger.debug(`[OGRRouterV2 - convertV2] file size: ${ctx.request.files.file.size}`);

            if (ctx.request.files.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                logger.info('[OGRRouterV2 - convertV2] It is an excel file');
                const xslxFile = XLSX.readFile(ctx.request.files.file.filepath);
                const csvPAth = path.parse(ctx.request.files.file.filepath);
                csvPAth.ext = '.csv';
                csvPAth.base = csvPAth.name + csvPAth.ext;
                XLSX.writeFile(xslxFile, path.format(csvPAth), { type: 'file', bookType: 'csv' });
                ctx.request.files.file.filepath = path.format(csvPAth);
                let options = ['-t_srs', 'EPSG:4326', '-oo', 'GEOM_POSSIBLE_NAMES=*geom*', '-oo', 'HEADERS=AUTO', '-oo', 'X_POSSIBLE_NAMES=Lon*', '-oo', 'Y_POSSIBLE_NAMES=Lat*', '-oo', 'KEEP_GEOM_COLUMNS=YES'];
                result = await ogr2ogr(ctx.request.files.file.filepath, { options, timeout:  60000});
            } else {
                logger.info('[OGRRouterV2 - convertV2] Not an excel file');

                let options;
                let inputPath = ctx.request.files.file.filepath

                if (ctx.request.files.file.mimetype === 'text/csv' || ctx.request.files.file.mimetype === 'application/vnd.ms-excel') {
                    logger.debug('csv transforming ...');
                    // @TODO
                    options = ["-s_srs", "EPSG:4326", "-t_srs", "EPSG:4326", '-oo', 'GEOM_POSSIBLE_NAMES=*geom*', '-oo', 'CSVLINE=YES', '-oo', 'X_POSSIBLE_NAMES=lon*,Lon*', '-oo', 'Y_POSSIBLE_NAMES=lat*,Lon*', '-oo', 'KEEP_GEOM_COLUMNS=YES'];
                } else {
                    options = ["-t_srs", "EPSG:4326", '-dim', '2'];
                    if (ctx.request.files.file.mimetype === 'application/zip') {
                        const readStream = fs.createReadStream(inputPath);
                        await new Promise((resolve, reject) => {
                            readStream.pipe(unzipper.Parse())
                            .on('entry', entry => {
                                if (entry.type === 'Directory') {
                                    inputPath = `/vsizip/${inputPath}/${entry.path}`
                                }
                                // Continue processing other entries
                                entry.autodrain();
                            })
                            .on('finish', () => {
                                console.log('Processing finished');                
                                resolve();
                            })
                        })   
                    }
                }
                result = await ogr2ogr(inputPath, { options, timeout: 60000});
            }


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
