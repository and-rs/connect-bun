import { connectNodeAdapter } from "@connectrpc/connect-node"
import { createServer } from "node:http"
import file_service from "./services/file_service"
import flight_service from "./services/flight_service"

const adapter = connectNodeAdapter({
  routes: (router) => {
    flight_service(router)
    file_service(router)
  },
})

const server = createServer(adapter).listen(5099)

console.log("Node Adapter listening on", server.address())
