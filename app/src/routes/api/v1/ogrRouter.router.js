const Router = require('koa-router');
const logger = require('logger');
const ogr2ogr = require('ogr2ogr').default;
const XLSX = require('xlsx');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const util = require('util');

const router = new Router({
    prefix: '/ogr'
});

class OgrRouterRouter {

    static async convert(ctx) {
        // logger.debug('Converting file...', ctx.request.body);

        ctx.assert(ctx.request.files && ctx.request.files.file, 400, 'File required');

        try {
            let result;
            if (ctx.request.files.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                logger.debug('IT IS A excel');
                const xslxFile = XLSX.readFile(ctx.request.files.file.filepath);
                const csvPAth = path.parse(ctx.request.files.file.filepath);
                csvPAth.ext = '.csv';
                csvPAth.base = csvPAth.name + csvPAth.ext;
                XLSX.writeFile(xslxFile, path.format(csvPAth), { type: 'file', bookType: 'csv' });
                ctx.request.files.file.filepath = path.format(csvPAth);
                // logger.debug(buf);
                const options = ['-t_srs', 'EPSG:4326']
                result = await ogr2ogr(ctx.request.files.file.filepath, { options, timeout: 60000});
            } else {
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
                                resolve();
                            })
                        })   
                    }
                }
                result = await ogr2ogr(inputPath, { options, timeout: 60000});
                ctx.body = GeoJSONSerializer.serialize(result['data']);  
            }

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
