# http-client-agents
A sandbox to test a few different agent solutions for Node.js across different clients

## Running test server

```bash
$ node server.js
```

## Running test http proxy

```bash
docker run --rm --name linkerd --network host -v `pwd`/config.yaml:/config.yaml buoyantio/linkerd:1.7.4 /config.yaml
```
