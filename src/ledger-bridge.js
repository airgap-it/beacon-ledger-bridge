'use strict'

import regeneratorRuntime from 'regenerator-runtime'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import WebSocketTransport from '@ledgerhq/hw-transport-http/lib/WebSocketTransport'
import Tezos from '@obsidiansystems/hw-app-xtz'
const TransportWebHID = require('@ledgerhq/hw-transport-webhid').default
// const Tezos = require('@ledgerhq/hw-app-xtz').default

// URL which triggers Ledger Live app to open and handle communication
const BRIDGE_URL = 'ws://localhost:8435'

// Number of seconds to poll for Ledger Live and Tezos app opening
const TRANSPORT_CHECK_LIMIT = 180
const TRANSPORT_CHECK_DELAY = 1000

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

  async createApp(useLedgerLive = true) {
    // if (this.transport) {
    //   if (useLedgerLive) {
    //     try {
    //       await WebSocketTransport.check(BRIDGE_URL)
    //       return this.app
    //     } catch (_err) {}
    //   } else {
    //     return this.app
    //   }
    // }

    // if (useLedgerLive) {
    //   try {
    //     await WebSocketTransport.check(BRIDGE_URL)
    //   } catch (_err) {
    //     window.open('ledgerlive://bridge?appName=Tezos Wallet')
    //     await this.checkLedgerLiveTransport()
    //   }

    //   this.transport = await WebSocketTransport.open(BRIDGE_URL)
    // } else {
    //   this.transport = await TransportU2F.create()
    // }

    if (!this.app) {
      this.app = new Tezos(await TransportWebHID.create())
    }

    return this.app
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

  async checkLedgerLiveTransport(i = 0) {
    return WebSocketTransport.check(BRIDGE_URL)
      .then(() => console.log('connected!'))
      .catch(async () => {
        await new Promise((r) => setTimeout(r, TRANSPORT_CHECK_DELAY))
        if (i < TRANSPORT_CHECK_LIMIT) {
          return this.checkLedgerLiveTransport(i + 1)
        } else {
          throw new Error('Ledger transport check timeout')
        }
      })
  }
}

BeaconLedgerBridge.defaultDerivationPath = "44'/1729'/0'/0'"
