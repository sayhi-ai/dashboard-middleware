export default class {

  constructor(file) {
    this.file = file
  }

  create(method, httpResponse, error, message) {
    return {
      file: this.file,
      method: method,
      httpRes: httpResponse,
      error: error,
      message: message
    }
  }
}
