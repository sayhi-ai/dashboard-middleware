import ENV_VARS from "../util/ENV_VARS"
import logger from "../util/logger"
import Lokka from 'lokka'
import HttpTransport from 'lokka-transport-http'

export default class {
  login(query) {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    const client = new Lokka({
      transport: new HttpTransport(ENV_VARS.CONSTANTS.GRAPHCOOL_URL, {headers})
    })

    return client.query(query.query)
      .then(response => {
        if (response !== undefined) {
          return response
        }
        throw new Error("GraphCool login query returned undefined.")
      })
      .catch(error => {
        logger.error("Error with GQ login query.")
        throw new Error(`Error with graph GQ login query -- Error: ${error}`)
      })
  }

  query(query) {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + query.token
    }
    const client = new Lokka({
      transport: new HttpTransport(ENV_VARS.CONSTANTS.GRAPHCOOL_URL, {headers})
    })

    return client.query(query.query)
      .then(response => {
        if (response !== undefined) {
          return response
        }
        throw new Error("GraphCool query returned undefined.")
      })
      .catch(error => {
        logger.error("Error with GQ query.")
        throw new Error(`Error with graph GQ query -- Error: ${error}`)
      })
  }
}
