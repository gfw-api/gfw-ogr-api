const nock = require('nock');
const chai = require('chai');
const fs = require('fs');
const { getTestServer } = require('../utils/test-server');
const { mockValidateRequestWithApiKey } = require('../utils/helpers');
const { mockPutAWSS3Object, mockGetAWSS3Object } = require('../utils/mocks');

chai.should();
chai.use(require('chai-datetime'));

const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('V2 convert tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('V2 convert with no file should fail', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v2/ogr/convert`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('status').and.equal(400);
        response.body.errors[0].should.have.property('detail').and.be.a('string');
        response.body.should.deep.equal({
            errors: [
                {
                    status: 400,
                    detail: 'File required'
                }
            ]
        });
    });

    it('V2 convert an invalid zip file should fail', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v2/ogr/convert`)
            .set('x-api-key', 'api-key-test')
            .attach('file', `${process.cwd()}/app/test/e2e/files/invalid.zip`);

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('status').and.equal(400);
        response.body.errors[0].should.have.property('detail').and.be.a('string');
    });

    it('V2 convert a valid zip file should be successful (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const fileData = JSON.parse(fs.readFileSync(`${process.cwd()}/app/test/e2e/files/shape_response_v2.json`));

        const response = await requester
            .post(`/api/v2/ogr/convert`)
            .set('x-api-key', 'api-key-test')
            .attach('file', `${process.cwd()}/app/test/e2e/files/shape.zip`);

        response.status.should.equal(200);
        response.body.should.deep.equal(fileData);
    });

    it('V2 convert a large zip file should be successful (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v2/ogr/convert`)
            .set('x-api-key', 'api-key-test')
            .attach('file', `${process.cwd()}/app/test/e2e/files/large.zip`);

        response.status.should.equal(200);
        response.body.should.have.all.keys('data');
        response.body.data.should.have.all.keys(['type', 'attributes']);
        response.body.data.attributes.should.have.all.keys(['type', 'features', 'crs']);
    });

    it('V2 convert a very large zip file should be successful (happy case)', async () => {
        mockPutAWSS3Object();
        mockGetAWSS3Object();
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v2/ogr/convert`)
            .set('x-api-key', 'api-key-test')
            .attach('file', `${process.cwd()}/app/test/e2e/files/very_large.zip`);

        response.status.should.equal(200);
    });

    it('V2 convert a valid csv file should be successful (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const fileData = JSON.parse(fs.readFileSync(`${process.cwd()}/app/test/e2e/files/points_response_v2.json`));

        const response = await requester
            .post(`/api/v2/ogr/convert`)
            .set('x-api-key', 'api-key-test')
            .attach('file', `${process.cwd()}/app/test/e2e/files/points.csv`);

        response.status.should.equal(200);
        response.body.should.deep.equal(fileData);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
