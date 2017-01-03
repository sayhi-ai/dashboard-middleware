import GCClient from "./graphcoolClient"

export default class {
  constructor() {
    this.gcClient = new GCClient()
  }

  getGCClient() {
    return this.gcClient
  }
}
