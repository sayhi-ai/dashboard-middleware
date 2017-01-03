import ClientsHandler from "./clients/clientsHandler"
import FunctionHandler from "./functions/functionHandler"

const _clientsHandler = new ClientsHandler()
const _functionHandler = new FunctionHandler(_clientsHandler)

const middleware = {
  getBotHandler() {
    return _functionHandler.getBotHandler()
  },

  getPhraseHandler() {
    return _functionHandler.getPhraseHandler()
  },

  getResponseHandler() {
    return _functionHandler.getResponseHandler()
  }
}

export default middleware
