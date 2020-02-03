import { APPLICATION_JSON, RSocketClient, JsonSerializer, IdentitySerializer, MESSAGE_RSOCKET_ROUTING } from 'rsocket-core'
import RSocketWebSocketClient from 'rsocket-websocket-client'
import { Flowable, Single } from 'rsocket-flowable'
import { ReactiveSocket } from 'rsocket-types'
const uuidv1 = require('uuid/v1')

// @ts-ignore
export default class RSocketGeojsonClient {
    // @ts-ignore
    private client: RSocketClient;
    private socket: any;
    private url: string;
    private guuid: string;
    private subscription: any;
    private nextRequestN: any;

    constructor (url: string) {
      this.url = url
      this.guuid = uuidv1()
      const keepAlive = 60000
      const lifetime = 60000

      this.client = new RSocketClient({
        serializers: {
          data: JsonSerializer,
          metadata: IdentitySerializer
        },
        setup: {
          keepAlive: keepAlive,
          lifetime: lifetime,
          dataMimeType: 'application/stream+json',
          metadataMimeType: 'message/x.rsocket.routing.v0'
        },
        transport: new RSocketWebSocketClient({
          debug: true,
          url: url
        })
      })
    }

    cancelSubscription () {
      if (this.subscription !== undefined) {
        this.subscription.cancel()
      }
    }

    closeWebsocket () {
      if (this.client !== undefined) {
        this.client.close()
      }
    }

    async reuseConnect () {
      if (this.socket === undefined) {
        try {
          this.socket = await this.client.connect()
        } catch (error) {
          console.error(error)
          error.url = this.url + '/' // + messageRoute

          let connectionError = {
            Id: this.guuid,
            Name: 'TravelTime RSocketClient',
            Description: 'Could not connect to: ' + error.url,
            Category: 3,
            Availability: false
          }
          throw connectionError
        }
      }
    }

    // eslint-disable-next-line camelcase
    getReqNFromSubscription () : any {
      console.log('getRequestN callled returning ' + this.nextRequestN)

      return this.nextRequestN
    }

    // eslint-disable-next-line camelcase
    setReqNOnSubscription (nextRequestN: any) {
      if ((nextRequestN > 0) && (this.nextRequestN === 0)) { // Start request it will be continued in onNext()
        this.subscription.request(nextRequestN)
      }

      this.nextRequestN = nextRequestN
      console.log('setRequest callled ' + this.nextRequestN)
    }

    async requestStream (messageRoute: String, callbackRecv, onComplete, data, requestN) {
      this.nextRequestN = requestN
      await this.reuseConnect()
      await this.socket.requestStream({
        data: data,
        metadata: String.fromCharCode(messageRoute.length) + messageRoute
      }).subscribe({
        onComplete: () => {
          console.log('RSocketGeoJsonClient::requestStream::onComplete')
          onComplete(messageRoute)
        },
        onError: error => {
          console.error(error)

          error.url = this.url + '/' + messageRoute
          let streamError = {
            Id: this.guuid,
            Name: 'TravelTime.rSocketClient',
            Description: 'Error during streaming: ' + error,
            Category: 3,
            Availability: false
          }
          // setErrorNotification(streamError);
        },
        onNext: payload => {
          callbackRecv(payload)
          if (this.nextRequestN > 0) {
            this.subscription.request(this.nextRequestN)
          }
        },
        onSubscribe: subscription => {
          console.log('RSocketGeoJsonClient::onSubscribe')
          subscription.request(this.nextRequestN)
          this.subscription = subscription
        }
      })
    }

    async requestResponse (messageRoute: String) {
      this.reuseConnect()

      return new Promise((resolve, reject) => {
        this.socket.requestResponse({
          data: null,
          metadata: String.fromCharCode(messageRoute.length) + messageRoute
        })
          .subscribe({
            onComplete: complete => resolve(complete),
            onError: error => {
              reject(error)
            },
            onNext (payload: any) {
              console.log('onNext(%s)', payload.data)
            }
          })
        setTimeout(() => {
        }, 30000000)
      })
    }
}
