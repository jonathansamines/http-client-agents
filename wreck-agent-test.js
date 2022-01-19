'use strict';

const http = require('http');
const https = require('https');
const assert = require('assert');
const Wreck = require('@hapi/wreck');
const HTTPProxyAgent = require('http-proxy-agent');
const HTTPSProxyAgent = require('https-proxy-agent');
const HPAgent = require('hpagent');
const LocalAgent = require('./local-agent');
const GlobalAgent = require('global-agent');

GlobalAgent.createGlobalProxyAgent({ environmentVariableNamespace: '', forceGlobalAgent: false });

const client = Wreck.defaults({
    baseUrl: 'http://127.0.0.1:4100',
});

const clientWithKeepAlive = Wreck.defaults({
    baseUrl: 'http://127.0.0.1:4100',
    agents: {
        http: new http.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxFreeSockets: 25 }),
        https: new https.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxFreeSockets: 25 }),
        httpsAllowUnauthorized: new https.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxFreeSockets: 25, rejectUnauthorized: false })
    },
});

const clientWithProxyAgent = Wreck.defaults({
    baseUrl: 'http://127.0.0.1:4100',
    agents: {
        http: new HTTPProxyAgent({ host: '127.0.0.1', port: 4200, protocol: 'http' }),
        https: new HTTPSProxyAgent({ host: '127.0.0.1', port: 4200, protocol: 'http' }),
        httpsAllowUnauthorized: new HTTPSProxyAgent({ host: '127.0.0.1', port: 4200, protocol: 'http', rejectUnauthorized: false }),
    },
});

const clientWithHPAgent = Wreck.defaults({
    baseUrl: 'http://127.0.0.1:4100',
    agents: {
        http: new HPAgent.HttpProxyAgent({ proxy: 'http://127.0.0.1:4200' }),
        https: new HPAgent.HttpsProxyAgent({ proxy: 'http://127.0.0.1:4200' }),
        httpsAllowUnauthorized: new HPAgent.HttpsProxyAgent({ proxy: 'http://127.0.0.1:4200', rejectUnauthorized: false }),
    },
});

const clientWithLocalAgent = Wreck.defaults({
    baseUrl: 'http://127.0.0.1:4100',
    agents: {
        http: new LocalAgent.HttpProxyAgent({ proxy: 'http://127.0.0.1:4200' }),
        https: new LocalAgent.HttpsProxyAgent({ proxy: 'http://127.0.0.1:4200' }),
        httpsAllowUnauthorized: new LocalAgent.HttpsProxyAgent({ proxy: 'http://127.0.0.1:4200', rejectUnauthorized: false }),
    },
});

const clientWithGlobalAgent = Wreck.defaults({
    baseUrl: 'http://127.0.0.1:4100',
    agents: {
        http: http.globalAgent,
        https: https.globalAgent,
        httpsAllowUnauthorized: https.globalAgent,
    },
});

async function run() {
    // default client

    const response = await client.get('/hello?client=default', { json: true });

    assert.deepStrictEqual(response.payload, { ok: true, client: 'default' });
    assert.strictEqual(response.res.headers['connection'], 'close');

    // client with keep alive

    const responseWithKeepAlive = await clientWithKeepAlive.get('/hello?client=keep-alive', { json: true });

    assert.deepStrictEqual(responseWithKeepAlive.payload, { ok: true, client: 'keep-alive' });
    assert.strictEqual(responseWithKeepAlive.res.headers['connection'], 'keep-alive');

    // // client with proxy agent

    const responseWithProxyAgent = await clientWithProxyAgent.get('/hello?client=proxy-agent', { json: true });

    assert.deepStrictEqual(responseWithProxyAgent.payload, { ok: true, client: 'proxy-agent' });
    assert.strictEqual(responseWithProxyAgent.res.headers['connection'], 'close');

    // client with hp agent (fail)

    const responseWithHPAgent = await clientWithHPAgent.get('/hello?client=hp-agent', { json: true });

    assert.deepStrictEqual(responseWithHPAgent.payload, { ok: true, client: 'hp-agent' });
    assert.strictEqual(responseWithHPAgent.res.headers['connection'], 'close');

    // client with local agent (fail)

    const responseWithLocalAgent = await clientWithLocalAgent.get('/hello?client=local-agent', { json: true });

    assert.deepStrictEqual(responseWithLocalAgent.payload, { ok: true, client: 'local-agent' });
    assert.strictEqual(responseWithLocalAgent.res.headers['connection'], 'close');

    // client with global agent

    const responseWithGlobalAgent = await clientWithGlobalAgent.get('/hello?client=global-agent', { json: true });

    assert.deepStrictEqual(responseWithGlobalAgent.payload, { ok: true, client: 'global-agent' });
    assert.strictEqual(responseWithGlobalAgent.res.headers['connection'], 'close');
}

run()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });