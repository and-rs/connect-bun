import { ConnectRouter } from "@connectrpc/connect"
import { FlightService } from "../gen/flight/v1/flight_request_pb"

export default (router: ConnectRouter) => {
  router.service(FlightService, {
    async flightEvent(req) {
      const now = new Date()
      console.log(`${now.toISOString()} >>> ${req.message}`)

      return {
        acknowledgment: req.message,
        receivedAt: {
          seconds: BigInt(Math.floor(now.getTime() / 1000)),
          nanos: now.getMilliseconds() * 1_000_000,
        },
      }
    },
  })
}
