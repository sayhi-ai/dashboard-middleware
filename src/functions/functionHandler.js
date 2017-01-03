import BotHandler from "./botHandler"
import PhraseHandler from "./phraseHandler"
import ResponseHandler from "./responseHandler"

export default class {
  constructor(clientsHandler) {
    this.responseHandler = new ResponseHandler(this, clientsHandler)
    this.phraseHandler = new PhraseHandler(this, clientsHandler)
    this.botHandler = new BotHandler(this, clientsHandler)
  }

  getBotHandler() {
    return this.botHandler
  }

  getPhraseHandler() {
    return this.phraseHandler
  }

  getResponseHandler() {
    return this.responseHandler
  }
}
