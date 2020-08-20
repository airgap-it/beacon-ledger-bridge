'use strict'

import regeneratorRuntime from 'regenerator-runtime'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import Tezos from '@obsidiansystems/hw-app-xtz'

const TARGET = 'BEACON-SDK-LEDGER-BRIDGE'

const Action = {
  GET_ADDRESS: 'getAddress',
  SIGN_TRANSACTION: 'signTransaction',
  SIGN_HASH: 'signHash',
  GET_VERSION: 'getVersion'
}

export default class BeaconLedgerBridge {
  constructor() {
    this.addEventListeners()
  }

  addEventListeners() {
    window.addEventListener(
      'message',
      (event) => {
        if (event && event.data && event.data.target === TARGET) {
          const { action, params, context } = event.data
          switch (action) {
            case Action.GET_ADDRESS:
              this.handleGetAddressAction(params, context)
              break
            case Action.SIGN_TRANSACTION:
              this.handleSignOperationAction(params, context)
              break
            case Action.SIGN_HASH:
              this.handleSignHashAction(params, context)
              break
            case Action.GET_VERSION:
              this.handleGetVersionAction(params, context)
              break
          }
        }
      },
      false
    )
  }

  sendResponse(action, payload, context) {
    window.parent.postMessage(
      {
        action: action,
        payload: payload,
        context: context
      },
      '*'
    )
  }

  sendError(action, error, context) {
    window.parent.postMessage(
      {
        action: action,
        error: error,
        context: context
      },
      '*'
    )
  }

  async handleGetAddressAction(params, context) {
    try {
      const address = await this.getAddress(params.derivationPath)
      this.sendResponse(Action.GET_ADDRESS, address, context)
    } catch (error) {
      this.sendError(Action.GET_ADDRESS, error, context)
    }
  }

  async handleSignOperationAction(params, context) {
    try {
      const result = await this.signOperation(params.operation, params.derivationPath)
      this.sendResponse(Action.SIGN_TRANSACTION, result, context)
    } catch (error) {
      this.sendError(Action.SIGN_TRANSACTION, error, context)
    }
  }

  async handleSignHashAction(params, context) {
    try {
      const result = await this.signHash(params.hash, params.derivationPath)
      this.sendResponse(Action.SIGN_HASH, result, context)
    } catch (error) {
      this.sendError(Action.SIGN_HASH, error, context)
    }
  }

  async handleGetVersionAction(params, context) {
    try {
      const result = await this.getVersion()
      this.sendResponse(Action.GET_VERSION, result, context)
    } catch (error) {
      this.sendError(Action.GET_VERSION, error, context)
    }
  }

  async createApp() {
    const transport = await TransportU2F.create()
    return new Tezos(transport)
  }

  async getAddress(derivationPath = BeaconLedgerBridge.defaultDerivationPath) {
    const app = await this.createApp()
    const result = await app.getAddress(derivationPath, true)
    return result.publicKey
  }

  async signOperation(operation, derivationPath = BeaconLedgerBridge.defaultDerivationPath) {
    const app = await this.createApp()
    // "03" prefix because it's an operation: https://github.com/obsidiansystems/ledger-app-tezos/blob/master/src/apdu_sign.c#L582
    const result = await app.signOperation(derivationPath, '03' + operation)
    return result.signature
  }

  async signHash(hash, derivationPath = BeaconLedgerBridge.defaultDerivationPath) {
    const app = await this.createApp()
    const result = await app.signHash(derivationPath, hash)
    return result.signature
  }

  async getVersion() {
    const app = await this.createApp()
    const result = await app.getVersion()
    return result
  }
}

BeaconLedgerBridge.defaultDerivationPath = "44'/1729'/0'/0'"
