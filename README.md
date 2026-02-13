# Connect Bun

Testing ground for implementing [Connect RPC](https://connectrpc.com/) with [Bun](https://bun.sh/).

This project is open to improvements and serves as an experimental implementation. The implementation might change in the future when Bun implements the `ReadableStream.from()` function.

## Overview

This repository benchmarks and tests Connect RPC streaming performance between Bun and Node.js, focusing on handling large file uploads and streaming data.

## Usage

**Bun Server:**

```bash
pnpm start
```

**Node Server:**

```bash
pnpm node
```

**Run Benchmark:**

```bash
pnpm run src/file_throughput.ts [port]
```

## Performance

For small requests, the Bun implementation shows a 2.1x to 2.3x overall throughput improvement compared to the regular Node implementation.

Benchmark test:

```bash
bun x autocannon -c 100 -d 10 -p 10 -m POST \
    -H "Content-Type: application/json" \
    -b '{ "message": "WE SENT IT BOYS" }' \
    http://localhost:4099/flight.v1.FlightService/FlighEvent
```

Results:

- Node implementation: 61k to 65k total requests
- Bun implementation: 120k to 140k total requests

## Features

- Client streaming for large file uploads
- Memory usage tracking
- Performance benchmarking (100MB test file)
- Comparison between Bun and Node.js implementations

## TODOS:

- [ ] Add Node version (v25), Bun version, OS, CPU specs as a table
- [ ] Run with HTTP/2 enabled (pass `httpVersion: "2.0"` to Connect transport)
- [ ] Capture GC pauses/CPU usage (use `autocannon --latency` for finer detail)
- [ ] Vary payload sizes: 1KB, 64KB, 1MB (test where the crossover is)
- [ ] Document why you chose HTTP/1.1 first, then explain the HTTP/2 results
- [ ] Add a "Practical Implications" section: "When does this 2.1x matter?"
