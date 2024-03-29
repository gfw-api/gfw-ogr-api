const Router = require('koa-router');
const logger = require('logger');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const util = require('util');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const fs = require('fs');
const path = require('path');
const mapshaper = require('mapshaper');
const OGRConverter = require('services/converter');

const router = new Router({
    prefix: '/ogr'
});

class OGRRouterV2 {

    static async convertV2(ctx) {
        logger.info('Converting file...', ctx.request.body);
        logger.debug(`request: ${JSON.stringify(ctx.request)}`);
        ctx.assert(ctx.request.files && ctx.request.files.file, 400, 'File required');
        logger.debug(`file data: ${JSON.stringify(ctx.request.files.file)}`);

        const simplify = ctx.query.simplify || null;
        const clean = ctx.query.clean || false;

        const simplifyCmd = simplify ? `-simplify visvalingam percentage=${simplify}% keep-shapes ` : '';
        const cleanCmd = clean && Boolean(clean) ? '-clean ' : '';

        try {
            const result = await OGRConverter.convert(ctx);

            // Mapshaper input stream from file
            const input = { 'input.json': result.data };
            const cmd = `-i no-topology input.json ${simplifyCmd}${cleanCmd} -each '__id=$.id' -o output.json`;
            logger.info('cmd:');
            logger.info(cmd);
            const resultPostMapshaper = await mapshaper.applyCommands(cmd, input);

            const fileSize = Buffer.byteLength(resultPostMapshaper['output.json']) / (1024 * 1024); // MB
            const filename = path.basename(ctx.request.files.file.filepath).split('.')[0];

            if (fileSize > 9.5) { // exceeds API Gateway response size limit of 10MB
                logger.info('[OGRRouterV2 - convertV2] uploading files to s3 bucket');
                const objectUrl = await OGRRouterV2.uploadToS3(
                    `${filename}.json`, JSON.stringify(GeoJSONSerializer.serialize(JSON.parse(resultPostMapshaper['output.json'])))
                );
                ctx.status = 303;
                ctx.set('Location', objectUrl);

                return ctx.redirect(objectUrl);
            }
            ctx.body = GeoJSONSerializer.serialize(JSON.parse(resultPostMapshaper['output.json']));
            logger.info('[OGRRouterV2 - convertV2] conversion finished');
        } catch (e) {
            logger.error('Error convertV2 file', e);
            ctx.throw(400, e.message.split('\n')[0]);
        } finally {
            logger.debug('Removing file');
            const unlink = util.promisify(fs.unlink);
            await unlink(ctx.request.files.file.filepath);
        }
    }

    static async uploadToS3(filename, content) {

        const clientConfig = { region: process.env.AWS_REGION };
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            clientConfig.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            };
        }

        const s3Client = new S3Client(clientConfig);
        const s3Payload = {
            Body: content,
            Bucket: process.env.CONVERTER_S3_BUCKET,
            Key: filename,
        };
        const command = new PutObjectCommand(s3Payload);
        await s3Client.send(command);

        const getCommand = new GetObjectCommand(s3Payload);
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 });
        return signedUrl;
    }

    static async uploadToS3(filename, content) {

        const clientConfig = { region: process.env.AWS_REGION };
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            clientConfig.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            };
        }

        const s3Client = new S3Client(clientConfig);
        const s3Payload = {
            Body: content,
            Bucket: process.env.CONVERTER_S3_BUCKET,
            Key: filename,
        };
        const command = new PutObjectCommand(s3Payload);
        await s3Client.send(command);

        const getCommand = new GetObjectCommand(s3Payload);
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 });
        return signedUrl;
    }

}

router.post('/convert', OGRRouterV2.convertV2);


module.exports = router;
