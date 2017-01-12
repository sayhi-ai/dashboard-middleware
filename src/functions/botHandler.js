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
        query getBots($id: ID!) {
          User(id: $id) {
            bots {
              id,
              name,
              description,
              tags
            }
          }
        }`,
      vars: {
        id: decodedToken.userId
      },
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

  addBot(token, name, description, tags) {
    logger.debug(`Adding a bot with name: ${name}, description: ${description}..`)

    const decodedToken = jwtDecode(token)
    const query = {
      query: `
        query checkDuplicateBot($id: ID!, $name: String!) {
          User(id: $id) {
            bots(filter: {name: $name}) {
              id
            }
          }
        }`,
      vars: {
        id: decodedToken.userId,
        name: name
      },
      token: token
    }

    return Promise.resolve()
      .then(() => {
        if (name === "" || name.length > ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH) {
          throw new Error(`Length of name must be between 0 and ${ENV_VARS.CONSTANTS.MAX_PHRASE_TOKEN_LENGTH}.`)
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
          return this._createNewBot(token, name, tags, description)
        }

        return {added: false}
      })
      .catch(error => {
        throw new Error(`Error adding bot. -- Error: ${error}`)
      })
  }

  _createNewBot(token, name, tags, description) {
    let realTags = ["{}"]
    if (tags.length > 0) {
      realTags = tags
    }

    const query = {
      query: `
        mutation createBot($name: String!, $description: String, $tags: [String!]!) {
          createBot(name: $name, tags: $tags, description: $description) {
            id
          }
        }`,
      vars: {
        name: name,
        tags: realTags,
        description: description
      },
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        logger.debug("Created new bot. Linking it with user..")
        return this._linkBotWithUser(token, response.createBot.id)
      })
      .catch(error => {
        throw new Error(`Error creating a new bot. -- Error: ${error}`)
      })
  }

  _linkBotWithUser(token, botId) {
    const decodedToken = jwtDecode(token)

    const query = {
      query: `
        mutation linkBotWithUser($userId: ID!, $botId: ID!) {
          addToUserBotRelation(usersUserId: $userId, botsBotId: $botId) {
            usersUser {
              id
            }
            botsBot {
              id
            }
          }
        }`,
      vars: {
        userId: decodedToken.userId,
        botId: botId
      },
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
        logger.debug("Adding initial phrase to bot..")
        return this._phraseHandler.addPhrase(token, botId, "Hi")
          .then(result => {
            if (result.added) {
              logger.debug("Initial phrase added to bot successfully.")
              return {added: true, id: botId}
            }
            logger.error(`Error adding initial phrase to bot: ${botId}.`)
            return {added: false, id: botId}
          })
          .catch(error => {
            throw new Error(`Error adding initial phrase to bot: "${botId}" -- Error: ${error}`)
          })
      })
      .catch(error => {
        throw new Error(`Error linking bot: "${botId}" with user: "${decodedToken.userId}" -- Error: ${error}`)
      })
  }

  updateBot(token, botId, name, tags, description) {
    let realTags = ["{}"]
    if (tags.length > 0) {
      realTags = tags
    }

    const query = {
      query: `
        mutation updateBot($id: ID!, $name: String!, $description: String, $tags: [String!]!) {
          updateBot(id: $id, name: $name, tags: $tags, description: $description) {
            id
          }
        }`,
      vars: {
        id: botId,
        name: name,
        tags: realTags,
        description: description
      },
      token: token
    }

    return this._gcClient.query(query)
      .then(response => {
        logger.debug(`Updated bot: ${botId}.`)
        if (response.updateBot !== null) {
          return {updated: true}
        }
        return {updated: false}
      })
      .catch(error => {
        throw new Error(`Unable to update bot. -- Error: ${error}`)
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
        query findBotToRemove($id: ID!) {
          Bot(id: $id) {
            phrases {
              id
            }
          }
        }`,
      vars: {
        id: botId
      },
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
          mutation deleteBot($id: ID!) {
            deleteBot(id: $id) {
              id
            }
          }`,
      vars: {
        id: botId
      },
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
