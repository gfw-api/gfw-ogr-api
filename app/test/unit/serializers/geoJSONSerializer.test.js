const GeoJSONSerializer = require('serializers/geoJSONSerializer');

describe('GeoJSON serializer test', () => {
    const single = {
        type: 'FeatureCollection',
        id: 'asdfa',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-130.078125,
                            52.05249047600099
                        ]
                    ]
                ]
            }
        }]
    };
    const severalFeatures = {
        type: 'FeatureCollection',
        id: 'asdfa',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-130.078125,
                            52.05249047600099
                        ]
                    ]
                ]
            }
        }, {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-107.57812499999999,
                            66.51326044311188
                        ],
                        [-107.57812499999999,
                            70.1403642720717
                        ]
                    ]
                ]
            }
        }]
    };

    it('Generate correct jsonapi response (single)', () => {
        const response = GeoJSONSerializer.serialize(single);
        response.should.not.be.an('array');
        response.should.have.property('data');
        const { data } = response;
        data.should.have.property('type');
        data.should.have.property('attributes');
        data.should.have.property('id');
        data.type.should.equal('geoJSON');
        data.id.should.equal(single.id);
        data.attributes.should.have.property('type');
        data.attributes.type.should.be.equal(single.type);
        data.attributes.should.have.property('features');
        data.attributes.features.should.be.an('array');
        data.attributes.features.should.length(single.features.length);
        const feature = data.attributes.features[0];
        feature.should.have.property('type');
        feature.type.should.be.equal(single.features[0].type);
        feature.should.have.property('geometry');
        feature.geometry.should.be.an('object');
        const { geometry } = feature;
        geometry.should.have.property('type');
        geometry.type.should.be.equal(single.features[0].geometry.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(single.features[0].geometry.coordinates.length);
        geometry.coordinates.should.be.equal(single.features[0].geometry.coordinates);
    });

    it('Generate correct jsonapi response (several)', () => {
        const response = GeoJSONSerializer.serialize(severalFeatures);
        response.should.not.be.an('array');
        response.should.have.property('data');
        const { data } = response;
        data.should.have.property('type');
        data.should.have.property('attributes');
        data.should.have.property('id');
        data.type.should.equal('geoJSON');
        data.id.should.equal(single.id);
        data.attributes.should.have.property('type');
        data.attributes.type.should.be.equal(severalFeatures.type);
        data.attributes.should.have.property('features');
        data.attributes.features.should.be.an('array');
        data.attributes.features.should.length(severalFeatures.features.length);
        const feature = data.attributes.features[0];
        feature.should.have.property('type');
        feature.type.should.be.equal(severalFeatures.features[0].type);
        feature.should.have.property('geometry');
        feature.geometry.should.be.an('object');
        const { geometry } = feature;
        geometry.should.have.property('type');
        geometry.type.should.be.equal(severalFeatures.features[0].geometry.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(severalFeatures.features[0].geometry.coordinates.length);
        geometry.coordinates.should.be.equal(severalFeatures.features[0].geometry.coordinates);
    });

});
