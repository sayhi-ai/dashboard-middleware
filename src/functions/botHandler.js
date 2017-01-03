import jwtDecode from "jwt-decode"
import ENV_VARS from "../util/ENV_VARS"
import logger from "../util/logger"
import Promise from "bluebird"

export default class {
  constructor(functionHandler, clientsHandler) {
    this._phraseHandler = functionHandler.getPhraseHandler()
    this._gcClient = clientsHandler.getGCClient()
  }

  getBots(token) {
    const decodedToken = jwtDecode(token)
    logger.debug(`Getting all bots for user: ${decodedToken.userId}..`)

    const query = {
      query: `
        query {
          User(id: "${decodedToken.userId}") {
            bots {
              id,
              name,
              type,
              description
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        const bots = response.User.bots
        logger.debug(`Got all bots for user: ${decodedToken.userId}.`)
        return {bots: bots}
      })
      .catch(error => {
        throw new Error(`Error getting bots for user ${decodedToken.userId} -- Error: ${error}`)
      })
  }

  addBot(token, name, type, description) {
    logger.debug(`Adding a bot with name: ${name}, type: ${type}, description: ${description}..`)

    const decodedToken = jwtDecode(token)

    const query = {
      query: `
        query {
          User(id: "${decodedToken.userId}") {
            bots(filter: {name: "${name}"}) {
              id
            }
          }
        }`,
      token: token
    }

    return Promise.resolve()
      .then(() => {
        if (name === "" || name.length > ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH) {
          throw new Error(`Length of name must be between 0 and ${ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH}.`)
        }
        return "no-op"
      })
      .then(noOp => {
        if (type === "" || type.length > ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH) {
          throw new Error(`Length of type must be between 0 and ${ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH}.`)
        }
        return "no-op"
      })
      .then(noOp => this._gcClient.query(query))
      .then(responseQl => {
        if (description === null) {
          description = ""
        }

        const bots = responseQl.User.bots
        if (bots.length === 0) {
          logger.debug(`No bot with the given information exists for user: ${decodedToken.userId}, creating a new one.`)
          return this._createNewBot(token, name, type, description)
        }

        throw new Error("A bot with this name already exists.")
      })
      .catch(error => {
        throw new Error(`Error adding bot. -- Error: ${error}`)
      })
  }

  _createNewBot(token, name, type, description) {
    const query = {
      query: `
        mutation {
          createBot(name: "${name}", type: "${type}", description: "${description}") {
            id
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        logger.debug("Created new bot. Linking it with user..")
        this._linkBotWithUser(token, response.createBot.id)
      })
      .catch(error => {
        throw new Error(`Error creating a new bot. -- Error: ${error}`)
      })
  }

  _linkBotWithUser(token, botId) {
    const decodedToken = jwtDecode(token)

    const query = {
      query: `
        mutation {
          addToUserBotRelation(usersUserId: "${decodedToken.userId}", botsBotId: "${botId}") {
            usersUser {
              id
            }
            botsBot {
              id
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        if (response.addToUserBotRelation === null) {
          logger.warn("Did not link bot because a connection already exists between user and bot.")
          return {added: false}
        }

        const botId = response.addToUserBotRelation.botsBot.id
        logger.debug("Linked bot with user successfully.")
        return {added: true, id: botId}
      })
      .catch(error => {
        throw new Error(`Error linking bot: "${botId}" with user: "${decodedToken.userId}" -- Error: ${error}`)
      })
  }

  removeBot(token, botId) {
    logger.debug(`Preparing to remove bot: ${botId}..`)
    return this._removePhrasesFromBot(token, botId)
      .then(response => this._removeBot(token, botId))
      .catch(error => {
        throw error
      })
  }

  _removePhrasesFromBot(token, botId) {
    logger.debug(`Removing phrases from bot: ${botId}..`)
    const query = {
      query: `
        query {
          Bot(id: "${botId}") {
            phrases {
              id
            }
          }
        }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        const phrases = response.Bot.phrases
        return new Promise((resolve, reject) => this._removePhraseResponsesRecursive(token, phrases.slice(),
          resolve, reject))
          .then(response => phrases)
          .catch(error => {
            throw error
          })
      })
      .then(phrases => {
        const phrasesImpl = phrases.map(phrase => {
          const context = this
          return Promise.resolve()
            .then(() => context._phraseHandler._removePhrase(token, phrase.id))
            .catch(error => {
              throw error
            })
        })

        return Promise.all(phrasesImpl)
      })
      .catch(error => {
        throw new Error(`Unable to remove phrases from bot: "${botId}" -- Error: ${error}`)
      })
  }

  _removePhraseResponsesRecursive(token, phrases, successFunc, errorFunc) {
    if (phrases.length === 0) {
      return successFunc()
    }
    const phrase = phrases.pop()
    const context = this
    const promise = new Promise((resolve, reject) => context._phraseHandler._removeResponsesFromPhrase(token, phrase.id,
        resolve, reject))

    promise.then(result => this._removePhraseResponsesRecursive(token, phrases, successFunc, errorFunc))
  }

  _removeBot(token, botId) {
    const query = {
      query: `
          mutation {
            deleteBot(id: "${botId}") {
              id
            }
          }`,
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        if (response.deleteBot === null) {
          logger.warn("Did not remove bot.")
          return {removed: false}
        }

        logger.debug("Removed bot.")
        return {removed: true}
      })
      .catch(error => {
        throw new Error(`Unable to remove bot: ${botId} -- Error: ${error}`)
      })
  }
}
