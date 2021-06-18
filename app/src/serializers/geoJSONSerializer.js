const logger = require('logger');
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
        logger.debug(`[GeoJSONSerializer - serialize] serializing ${JSON.stringify(data)}`);
        return geoJSONSerializer.serialize(data);
    }

}

module.exports = GeoJSONSerializer;
