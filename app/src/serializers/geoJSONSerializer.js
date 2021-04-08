const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const geoJSONSerializer = new JSONAPISerializer('geoJSON', {
    attributes: ['type', 'features', 'crs'],
    features: {
        attributes: ['type', 'properties', 'geometry']
    },
    crs: {
        attributes: ['type', 'properties']
    },
    typeForAttribute(attribute) {
        return attribute;
    }
});

class GeoJSONSerializer {

    static serialize(data) {
        return geoJSONSerializer.serialize(data);
    }

}

module.exports = GeoJSONSerializer;
