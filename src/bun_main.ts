import { createConnectRouter, type ConnectRouter } from "@connectrpc/connect"
import type { UniversalHandler } from "@connectrpc/connect/protocol"
import { Buffer } from "node:buffer"
import file_service from "./services/file_service"
import flight_service from "./services/flight_service"

const MethodKind = {
  Unary: "unary",
  ServerStreaming: "server_streaming",
  ClientStreaming: "client_streaming",
  BiDiStreaming: "bidi_streaming",
} as const

type BunBody = ReadableStream<Uint8Array> | Uint8Array | null

async function* bufferToIterable(chunk: Uint8Array) {
  yield chunk
}

async function materialize(
  iterable: AsyncIterable<Uint8Array>,
): Promise<Uint8Array> {
  const iterator = iterable[Symbol.asyncIterator]()
  const first = await iterator.next()
  if (first.done) return new Uint8Array(0)

  const second = await iterator.next()
  if (second.done) return first.value

  const chunks = [first.value, second.value]
  let current = await iterator.next()
  while (!current.done) {
    chunks.push(current.value)
    current = await iterator.next()
  }
  return Buffer.concat(chunks)
}

async function* streamToIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<Uint8Array> {
  for await (const chunk of stream) {
    yield chunk
  }
}

function iterableToStream(
  iterable: AsyncIterable<Uint8Array>,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of iterable) {
          controller.enqueue(chunk)
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

function createBunHandler(router: ConnectRouter) {
  const routeMap = new Map<string, UniversalHandler>()
  for (const handler of router.handlers) {
    routeMap.set(handler.requestPath, handler)
  }

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const handler = routeMap.get(url.pathname)

    if (!handler) {
      return new Response("Not Found", { status: 404 })
    }

    const lenHeader = req.headers.get("content-length")
    const hasLength = lenHeader !== null
    const contentLength = hasLength ? Number(lenHeader) : 0

    const isBigPayload = !hasLength || contentLength > 5 * 1024 * 1024

    const kind = handler.method.methodKind
    const useStreamInput =
      kind === MethodKind.ClientStreaming ||
      kind === MethodKind.BiDiStreaming ||
      isBigPayload

    const useStreamOutput =
      kind === MethodKind.ServerStreaming || kind === MethodKind.BiDiStreaming

    try {
      let reqBody: AsyncIterable<Uint8Array>

      if (req.body === null) {
        reqBody = (async function* () {})()
      } else if (useStreamInput) {
        reqBody = streamToIterable(req.body)
      } else {
        reqBody = bufferToIterable(new Uint8Array(await req.arrayBuffer()))
      }

      const uRes = await handler({
        httpVersion: "2.0",
        url: req.url,
        method: req.method,
        header: req.headers,
        body: reqBody,
        signal: req.signal,
      })

      let resBody: BunBody

      if (!uRes.body) {
        resBody = null
      } else if (useStreamOutput) {
        resBody = iterableToStream(uRes.body)
      } else {
        resBody = await materialize(uRes.body)
      }

      return new Response(resBody, {
        status: uRes.status,
        headers: uRes.header,
      })
    } catch (e) {
      console.error(`Handler failed for ${url.pathname}`, e)
      return new Response("Internal Server Error", { status: 500 })
    }
  }
}

const router = createConnectRouter()
file_service(router)
flight_service(router)

const server = Bun.serve({
  port: 4099,
  fetch: createBunHandler(router),
})

console.log(`Server listening on :${server.port}`)
