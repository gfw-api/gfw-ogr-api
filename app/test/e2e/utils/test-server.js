const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const config = require('config');
const { mockCloudWatchSetupRequestsSequence } = require('rw-api-microservice-node/dist/test-mocks');

let requester;

chai.use(chaiHttp);

exports.getTestServer = function getTestServer() {
    if (requester) {
        return requester;
    }

    mockCloudWatchSetupRequestsSequence({
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name').replace(/ /g, '_')
    });

    const server = require('../../../src/app');
    requester = chai.request(server).keepOpen();

    return requester;
};
