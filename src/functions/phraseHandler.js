import ENV_VARS from "../util/ENV_VARS"
import logger from "../util/logger"
import Promise from "bluebird"

export default class {
  constructor(functionHandler, clientsHandler) {
    this._responseHandler = functionHandler.getResponseHandler()
    this._gcClient = clientsHandler.getGCClient()
  }

  getPhrases(token, botId) {
    logger.debug(`Getting all phrases for bot: ${botId}.`)

    const query = {
      query: `
        query {
          Bot(id: "${botId}") {
            phrases {
              id,
              phrase
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        logger.debug(`Got all phrases for bot: ${botId}.`)
        return {phrases: response.Bot.phrases}
      })
      .catch(error => {
        throw new Error(`Unable to get all phrases for bot: ${botId} -- Error: ${error}`)
      })
  }

  addPhrase(token, botId, phrase) {
    logger.debug(`Adding phrase to bot: ${botId}.`)

    const query = {
      query: `
        query {
          Bot(id: "${botId}") {
            phrases(filter: {phrase: "${phrase}"}) {
              id
            }
          }
        }`,
      token: token
    }

    return Promise.resolve()
      .then(() => {
        if (phrase === `` || phrase.length > ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH) {
          throw new Error(`Length of phrase must be between 0 and ${ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH}.`)
        }

        return `no-op`
      })
      .then(noOp => {
        if (phrase.includes(ENV_VARS.CONSTANTS.RESPONSE_VARIABLE)) {
          throw new Error(`${ENV_VARS.CONSTANTS.RESPONSE_VARIABLE} not allowed in phrase`)
        }

        return `no-op`
      })
      .then(noOP => this._gcClient.query(query))
      .then(response => {
        const phrases = response.Bot.phrases
        if (phrases.length === 0) {
          logger.debug(`Phrase does not exists for bot: ${botId}, creating a new one.`)
          return response
        }

        throw new Error(`Duplicate phrase found.`)
      })
      .then(response => this._createNewPhrase(token, botId, phrase))
      .catch(error => {
        throw error
      })
  }

  _createNewPhrase(token, botId, phrase) {
    const query = {
      query: `
        mutation {
          createPhrase(phrase: "${phrase}") {
            id
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        logger.debug(`Created phrase for bot: ${botId}, linking phrase with the bot now..`)
        return response
      })
      .then(response => this._linkPhraseToBot(token, botId, response.createPhrase.id))
      .catch(error => {
        throw new Error(`Unable to create new phrase. -- Error: ${error}`)
      })
  }

  _linkPhraseToBot(token, botId, phraseId) {
    const query = {
      query: `
        mutation {
          addToBotPhraseRelation(
            botsBotId: "${botId}",
            phrasesPhraseId: "${phraseId}"
          ) {
            botsBot {
              id
            },
            phrasesPhrase {
              id
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        if (response.addToBotPhraseRelation === null) {
          logger.warn(`Did not link phrase because a connection already exists between bot and phrase.`)
          return {added: false}
        }

        const phraseId = response.addToBotPhraseRelation.phrasesPhrase.id
        logger.debug(`Linked phrase: ${phraseId} with bot: ${botId} successfully.`)
        return {added: true, id: phraseId}
      })
      .catch(error => {
        throw new Error(`Unable to link phrase: ${phraseId} to bot: ${botId} -- Error: ${error}`)
      })
  }

  removePhrase(token, phraseId) {
    logger.debug(`Preparing to remove phrase: ${phraseId}..`)

    return this._removeResponsesFromPhrase(token, phraseId)
      .then(response => this._removePhrase(token, phraseId))
      .catch(error => {
        throw error
      })
  }

  _removeResponsesFromPhrase(token, phraseId) {
    logger.debug(`Removing responses from phrase: ${phraseId}..`)

    const query = {
      query: `
        query {
          Phrase(id: "${phraseId}") {
            responses {
              id
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(responseGc => {
        let responses = responseGc.Phrase.responses

        responses = responses.map(response => {
          const context = this
          return Promise.resolve()
            .then(() => context._responseHandler.removeResponse(token, phraseId, response.id))
            .then(json => {
              if (json.removed) {
                return json.removed
              }
              throw new Error(`Unable to remove a response for ${phraseId}`)
            })
            .catch(error => {
              throw error
            })
        })

        return Promise.all(responses)
      })
      .catch(error => {
        throw new Error(`Unable to remove one more response from phrase: ${phraseId} -- Error: ${error}`)
      })
  }

  _removePhrase(token, phraseId) {
    const query = {
      query: `
          mutation {
            deletePhrase(id: "${phraseId}") {
              id
            }
          }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        if (response.deletePhrase === null) {
          logger.warn(`Did not remove phrase.`)
          return {removed: false}
        }

        logger.debug(`Removed phrase.`)
        return {removed: true}
      })
      .catch(error => {
        throw new Error(`Unable to remove phrase: ${phraseId} -- Error: ${error}`)
      })
  }
}
