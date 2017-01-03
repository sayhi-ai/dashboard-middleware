import ENV_VARS from "../util/ENV_VARS"
import logger from "../util/logger"
import Promise from "bluebird"

export default class {
  constructor(functionHandler, clientsHandler) {
    this._gcClient = clientsHandler.getGCClient()
  }

  getResponses(token, phraseId, type) {
    logger.debug(`Getting responses for phrase: ${phraseId}..`)
    return this._getResponses(token, phraseId, type, null)
      .then(response => {
        return {responses: response}
      })
      .catch(error => {
        throw error
      })
  }

  _getResponses(token, phraseId, type) {
    const query = {
      query: `
        query {
          Phrase(id: "${phraseId}") {
            responses {
              id,
              ${type}
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        logger.debug(`Got responses for phrase: ${phraseId}.`)
        return response.Phrase.responses
      })
      .catch(error => {
        throw new Error(`Unable to get responses for phrase: ${phraseId} -- Error: ${error}`)
      })
  }

  addResponse(token, phraseId, text, html, vars) {
    logger.debug(`Adding a response to phrase: ${phraseId}..`)

    const query = {
      query: `
        query {
          allResponses(filter: {text: "${text}"}) {
            id
          }
        }`,
      token: token
    }

    return Promise.resolve()
      .then(() => {
        if (text === "" || text.length > ENV_VARS.CONSTANTS.MAX_RESPONSE_LENGTH) {
          throw new Error(`Length of response must be between 0 and ${ENV_VARS.CONSTANTS.MAX_RESPONSE_LENGTH}.`)
        }
        return "no-op"
      })
      .then(noOp => this._gcClient.query(query))
      .then(responseQl => {
        const responses = responseQl.allResponses
        if (responses.length === 0) {
          logger.debug(`Creating a new response: ${text}..`)
          return this._createNewResponse(token, phraseId, text, html, vars)
        } else if (responses.length === 1) {
          logger.debug(`Response exists already, linking response: ${text} to phrase: ${phraseId}..`)
          return this._linkResponseToPhrase(token, phraseId, responses[0].id)
        }
        throw new Error("Duplicate response found.")
      })
      .catch(error => {
        throw new Error(`Unable to add a response. -- ${error}`)
      })
  }

  _createNewResponse(token, phraseId, text, html, vars) {
    let realVars = ["{}"]
    if (vars.length > 0) {
      realVars = vars
    }

    const query = {
      query: `
        mutation {
          createResponse(
            text: "${text}",
            html: "${html}",
            vars: ${JSON.stringify(realVars)}
          ) {
            id
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(responseQl => {
        logger.debug(`Response created, linking response: ${text} to phrase: ${phraseId}..`)
        return this._linkResponseToPhrase(token, phraseId, responseQl.createResponse.id)
      })
      .catch(error => {
        throw new Error(`Unable to create new response: ${text} -- Error: ${error}`)
      })
  }

  _linkResponseToPhrase(token, phraseId, responseId) {
    const query = {
      query: `
        mutation {
          addToPhraseResponseRelation(
            phrasesPhraseId: "${phraseId}",
            responsesResponseId: "${responseId}"
          ) {
            phrasesPhrase {
              id
            }
            responsesResponse {
              id
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        if (response.addToPhraseResponseRelation === null) {
          logger.warn("Did not link response because a connection already exists between phrase and response.")
          return {added: false}
        }

        const responseId = response.addToPhraseResponseRelation.responsesResponse.id
        logger.debug(`Linked response: ${responseId} with phrase: ${phraseId} successfully.`)
        return {added: true, id: responseId}
      })
      .catch(error => {
        throw new Error(`Unable to link response: ${responseId} to phrase: ${phraseId}. -- Error: ${error}`)
      })
  }

  removeResponse(token, phraseId, responseId) {
    logger.debug(`Removing response: ${responseId}..`)

    const query = {
      query: `
        query {
          Response(id: "${responseId}") {
            phrases {
              id
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(responseGc => {
        if (responseGc.Response.phrases.length === 1) {
          logger.debug("Response found to remove.")
          return this._removeResponse(token, responseId)
        }

        logger.debug("Response found to unlink from phrase.")
        return this._unlinkResponse(token, phraseId, responseId)
      })
      .catch(error => {
        throw new Error(`Unable to find response to remove for phrase: ${phraseId}. -- Error: ${error}`)
      })
  }

  _unlinkResponse(token, phraseId, responseId) {
    const query = {
      query: `
        mutation {
          removeFromPhraseResponseRelation(
            phrasesPhraseId: "${phraseId}",
            responsesResponseId: "${responseId}"
          ) {
            phrasesPhrase {
              id
            }
            responsesResponse {
              id
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        if (response.removeFromPhraseResponseRelation === null) {
          logger.warn("Did not unlink response.")
          return {removed: false}
        }

        logger.debug("Unlinked response.")
        return {removed: true}
      })
      .catch(error => {
        throw new Error(`Unable to remove response: ${responseId} -- Error: ${error}`)
      })
  }

  _removeResponse(token, responseId) {
    const query = {
      query: `
        mutation {
          deleteResponse(id: "${responseId}") {
            id
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        if (response.deleteResponse === null) {
          logger.warn("Did not remove response.")
          return {removed: false}
        }

        logger.debug("Removed response.")
        return {removed: true}
      })
      .catch(error => {
        throw new Error(`Unable to remove response: ${responseId} -- Error: ${error}`)
      })
  }
}
