# Global Forest Watch OGR API

[![Build Status](https://travis-ci.com/gfw-api/gfw-ogr-api.svg?branch=dev)](https://travis-ci.com/gfw-api/gfw-ogr-api)
[![Test Coverage](https://api.codeclimate.com/v1/badges/a818cbdf6e1cb49d6256/test_coverage)](https://codeclimate.com/github/gfw-api/gfw-ogr-api/test_coverage)

This repository is the microservice that implements the OGR
funcionality, which is exposed on the /convert endpoint.

The OGR service is used to convert various geo formats in to GeoJSON (in
a web mercator projection), mainly to be used on the GFW map. For
example, it can convert uploaded Shapefiles to GeoJSON.

[View the documentation for this
API](http://gfw-api.github.io/swagger-ui/?url=https://raw.githubusercontent.com/Vizzuality/gfw-ogr-api/master/app/microservice/swagger.yml#/OGR)

1. [Getting Started](#getting-started)
2. [Deployment](#deployment)

## Getting Started

### OS X

**First, make sure that you have the [API gateway running
locally](https://github.com/Vizzuality/api-gateway/tree/master#getting-started).**

We're using Docker which, luckily for you, means that getting the
application running locally should be fairly painless. First, make sure
that you have [Docker Compose](https://docs.docker.com/compose/install/)
installed on your machine.

If you've not used Docker before, you may need to set up some defaults:

```
docker-machine create --driver virtualbox default
docker-machine start default
eval $(docker-machine env default)
```

Now we're ready to actually get the application running:

```
git clone https://github.com/Vizzuality/gfw-ogr-api.git
cd gfw-ogr-api
npm install
npm run develop
```

You can now access the microservice through the API gateway.

## Deployment

The application is deployed to Heroku. Setup Heroku for the repository:

```
heroku git:remote -a gfw-ogr-api-staging -r staging
```

And deploy as normal:

```
git push staging master
```

### Configuration

It is necessary to define these environment variables:

* API_GATEWAY_URI => Gateway Serice API URL
* NODE_ENV => Environment (prod, staging, dev)
