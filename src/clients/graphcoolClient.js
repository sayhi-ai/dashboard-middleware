import ENV_VARS from "../util/ENV_VARS"
import logger from "../util/logger"
import _errorHandler from "../util/errorHandler"
import Lokka from 'lokka'
import HttpTransport from 'lokka-transport-http'

export default class {
  constructor() {
    this._errorHandler = new _errorHandler("graphcoolClient.js")
  }

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
        throw this._errorHandler.create("login", 500, "", "GraphCool login query returned undefined.")
      })
      .catch(error => {
        logger.error("Error with GQ login query.")
        throw this._errorHandler.create("login", 500, error, "Error with graph GQ login query.")
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
        throw this._errorHandler.create("query", 500, "", "GraphCool query returned undefined.")
      })
      .catch(error => {
        logger.error("Error with GQ query.")
        throw this._errorHandler.create("query", 500, error, "Error with graph GQ query.")
      })
  }
}
