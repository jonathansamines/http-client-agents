'use strict';

const { URL } = require('url');
const tls = require('tls');
const http = require('http');
const https = require('https');

const initialize = (self, options) => {
    self.proxy = typeof options.proxy === 'string' ? new URL(options.proxy) : options.proxy;
};

const getBasic = (url) => {
    let basic = '';
    if (url.username || url.password) {
        const username = decodeURIComponent(url.username);
        const password = decodeURIComponent(url.password);
        basic = Buffer.from(`${username}:${password}`).toString('base64');
        return `Basic ${basic}`;
    }
    return basic;
};

class HttpRegularProxyAgent extends http.Agent {
    constructor(options) {
        super(options);
        initialize(this, options);
    }
    addRequest(request, options) {
        if (options.socketPath) {
            // @ts-expect-error @types/node is missing types
            super.addRequest(request, options);
            return;
        }
        const hostport = `${options.host}:${options.port}`;
        const url = new URL(`${request.protocol}//${hostport}${request.path}`);
        options = Object.assign(Object.assign({}, options), { host: this.proxy.hostname, port: this.proxy.port });
        request.path = url.href;
        const basic = getBasic(this.proxy);
        if (basic) {
            request.setHeader('proxy-authorization', basic);
        }
        // @ts-expect-error @types/node is missing types
        super.addRequest(request, options);
    }
}

class HttpProxyAgent extends http.Agent {
    constructor(options) {
        super(options);
        initialize(this, options);
    }
    createConnection(options, callback) {
        if (options.path) {
            // @ts-expect-error @types/node is missing types
            super.createConnection(options, callback);
            return;
        }
        const fn = this.proxy.protocol === 'https:' ? https.request : http.request;
        const hostport = `${options.host}:${options.port}`;
        const headers = {
            host: hostport,
        };
        const basic = getBasic(this.proxy);
        if (basic) {
            headers['proxy-authorization'] = basic;
            headers.authorization = basic;
        }
        const connectRequest = fn(this.proxy, {
            method: 'CONNECT',
            headers,
            path: hostport,
            agent: false,
            rejectUnauthorized: false,
        });
        connectRequest.once('connect', (response, socket, head) => {
            if (head.length > 0 || response.statusCode !== 200) {
                socket.destroy();
                const error = new Error(`The proxy responded with ${response.statusCode}: ${head.toString()}`);
                callback(error);
                return;
            }
            if (options.protocol === 'https:') {
                callback(undefined, tls.connect(Object.assign(Object.assign({}, options), { socket })));
                return;
            }
            callback(undefined, socket);
        });
        connectRequest.once('error', (error) => {
            callback(error);
        });
        connectRequest.end();
    }
}

class HttpsProxyAgent extends https.Agent {
    constructor(options) {
        super(options);
        initialize(this, options);
    }
    createConnection(options, callback) {
        HttpProxyAgent.prototype.createConnection.call(this, options, callback);
    }
}

module.exports = {
    HttpsProxyAgent,
    HttpProxyAgent,
    HttpRegularProxyAgent,
};