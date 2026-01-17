import { createClient } from "@connectrpc/connect"
import { createConnectTransport } from "@connectrpc/connect-node"
import { FileService } from "./gen/file/v1/file_pb"

const port = process.argv[2] || "5099"

const transport = createConnectTransport({
  baseUrl: `http://localhost:${port}`,
  httpVersion: "1.1",
})

const client = createClient(FileService, transport)

const chunkData = new Uint8Array(1024 * 64).fill(0)

async function* generate() {
  // 1563 chunks of 64KB ≈ 100MB
  for (let i = 0; i < 1563; i++) {
    yield { data: chunkData }
  }
}

async function run() {
  console.log(`Starting 100MB upload to :${port}...`)

  try {
    const start = performance.now()
    const res = await client.upload(generate())
    const end = performance.now()

    const seconds = (end - start) / 1000
    const mb = Number(res.size) / (1024 * 1024)

    console.log("-----------------------------------------")
    console.log(`Target Port:   ${port}`)
    console.log(`Total Sent:    ${mb.toFixed(2)} MB`)
    console.log(`Time Taken:    ${seconds.toFixed(2)} s`)
    console.log(`Throughput:    ${(mb / seconds).toFixed(2)} MB/s`)
    console.log(`Server Chunks: ${res.chunks}`)
    console.log("-----------------------------------------")
  } catch (err) {
    console.error("Benchmark failed:", err)
  }
}

run()
