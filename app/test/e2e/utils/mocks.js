const nock = require('nock');


exports.mockPutAWSS3Object = function mockPutAWSS3Object() {

    nock(`https://${process.env.CONVERTER_S3_BUCKET}.s3.us-east-1.amazonaws.com`)
        .persist()
        .put(/.*/)
        .reply(200, {});
};

exports.mockGetAWSS3Object = function mockPutAWSS3Object() {

    nock(`https://${process.env.CONVERTER_S3_BUCKET}.s3.us-east-1.amazonaws.com`)
        .persist()
        .get(/.*/)
        .reply(200, {});

};
