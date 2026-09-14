export class ResourceSessionError extends Error {
  constructor() {
    super('The saved session is not accepted by PocketBase.')
    this.name = 'ResourceSessionError'
  }
}
