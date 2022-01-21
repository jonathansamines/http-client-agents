'use strict';

const Joi = require('joi');
const Hapi = require('@hapi/hapi');
const H202 = require('@hapi/h2o2');

async function createServer(options) {
    const server = Hapi.server(options);

    server.validator(Joi);

    server.route({
        method: 'GET',
        path: '/hello',
        options: {
            validate: {
                query: {
                    client: Joi.string().default('default'),
                }
            }
        },
        handler(request) {
            request.log(['access', 'log'], `server responding to client (${request.query.client}) from proxy (${request.headers?.['l5d-reqid'] ?? 'no proxy'})`);
            return { ok: true, client: request.query.client };
        }
    });

    return server;
}

async function createProxy(options) {
    const proxy = Hapi.server(options);
    await proxy.register(H202);

    proxy.route({
        method: '*',
        path: '/{p*}',
        handler: {
            proxy: {
                passThrough: true,
                host: '127.0.0.1',
                protocol: 'http',
                port: 4100,
            }
        }
    });

    return proxy;
}

async function run() {
    const server = await createServer({ host: '127.0.0.1', port: 4100, debug: { request:  ['*'], log: ['*'] } });    
    // const proxy = await createProxy({ host: '127.0.0.1', port: 4200, debug: { request:  ['*'], log: ['*'] } });

    // await proxy.start();
    await server.start();
}

run()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });