import { ConnectRouter } from "@connectrpc/connect"
import { FileService } from "../gen/file/v1/file_pb"
import type { DownloadRequest } from "../gen/file/v1/file_pb"

export default (router: ConnectRouter) => {
  router.service(FileService, {
    async upload(reqs) {
      let size = 0n
      let chunks = 0
      for await (const req of reqs) {
        size += BigInt(req.data.length)
        chunks++
      }
      return { size, chunks }
    },
    async *download(_req: DownloadRequest) {
      const chunk = new Uint8Array(1024 * 1024).fill(0x61)
      for (let i = 0; i < 1024; i++) {
        yield { data: chunk }
      }
    },
  })
}
