import RSocketGeojsonClient from './../rsocket/RsocketGeojsonClient'
import { google, LatLng, Feature, event } from '@google/maps'

// import $ from '@types/googlemaps';

export default class TravelTimeService {
    private rsocketClient: RSocketGeojsonClient;
    private readonly map: google.maps;
    private googleMapsApi: any;
    private connMetaData: any;

    constructor (map: google.maps.Map, api: google.maps, rSocketClient: RSocketGeojsonClient, connMetaData: any) {
      this.map = map
      this.googleMapsApi = api
      this.rsocketClient = rSocketClient
      this.connMetaData = connMetaData

      map.data.addListener('addfeature', this.addFeatureEvent)
      map.data.addListener('setproperty', this.propertyChangeEvent)

      map.data.addListener('click', (event) => {
        this.createRoadPopup(event.feature, event.latLng)
      })
    }

    async test () {
      let x = await this.rsocketClient.requestResponse('test')
      console.log(x)
    }

    async liveSubscription (route) {
      this.cancelSubscription()
      await this.rsocketClient.requestStream(route, this.addFeatureToMap.bind(this), this.onComplete.bind(this), null, 2147483647)
    }

    async replaySubscription (route) {
      // this.connMetaData = metaData
      // console.error("connMetaData" + this.connMetaData);

      try {
        this.cancelSubscription()
        await this.rsocketClient.requestStream(route, this.featureUpdateHandler.bind(this), this.onComplete.bind(this), this.connMetaData['replaySpeed'], 1)
      } catch (error) {
        console.error('replaySubscription -> error')
        console.error(error)
      }
    }

    playPause () {
      try {
        let nResult = this.rsocketClient.getReqNFromSubscription()
        console.log('Service.playPause() current is: ' + nResult)
        if (nResult !== 0) {
          console.log('Pause the stream')
          this.rsocketClient.setReqNOnSubscription(0)
        } else {
          console.log('Play the stream')
          this.rsocketClient.setReqNOnSubscription(1)
        }

        // await this.rsocketClient.requestStream(route, this.featureUpdateHandler.bind(this), this.onComplete.bind(this), delayElements);
      } catch (error) {
        console.error(error)
      }
    }

    async rewindReplay (route, delayElements) {
      try {
        // await this.rsocketClient.requestStream(route, this.featureUpdateHandler.bind(this), this.onComplete.bind(this), delayElements);

      } catch (error) {
        console.error(error)
      }
    }

    async ffwReplay (route, delayElements) {
      try {
        // await this.rsocketClient.requestStream(route, this.featureUpdateHandler.bind(this), this.onComplete.bind(this), delayElements);

      } catch (error) {
        console.error(error)
      }
    }

    featureUpdateHandler = (payload) => {
      console.log(payload.data.length)
      console.log(payload.data[0].pubDate)
      this.connMetaData['currentPlayedDate'] = payload.data[0].pubDate
      this.connMetaData.connInitialized = true
      payload.data.forEach((dto) => {
        if (dto !== undefined) {
          let feature = this.map.data.getFeatureById(dto.Id)
          if (feature !== undefined) {
            for (let propName in dto) {
              feature.setProperty(propName, dto[propName])
            }
          } else {

            // TODO: Received new Feature...
            //  Request full GeoJson from backend and add to map
            // console.log(dto);
          }
        }
      })
    }

    featureUpdateHandlerFull = (payload) => {
      const LAST_SEEN_CHANGE = 'lastSeenChange'

      payload.data.forEach((dto) => {
        if (dto !== undefined) {
          let feature = this.map.data.getFeatureById(dto.Id)
          if (feature !== undefined) {
            //       console.log(feature.Id);
            for (let propName in dto) {
              feature.setProperty(propName, dto[propName])
            }
            if (dto[LAST_SEEN_CHANGE] === undefined) {
              feature[LAST_SEEN_CHANGE] = dto[LAST_SEEN_CHANGE]
            }
          } else {
            // TODO: Received new Feature...
            //      Request geometry from backend.
            // console.log(dto);
          }
        }
      })
    }

    cancelSubscription () {
      this.rsocketClient.cancelSubscription()
      this.connMetaData.connInitialized = false
    }

    closeConnection () {
      this.rsocketClient.closeWebsocket()
      this.connMetaData.connInitialized = false
    }

    addFeatureToMap = (payload) => {
      let feature = payload.data
      this.map.data.addGeoJson(feature)
    }

    propertyChangeEvent = (event) => {
      //  console.log(event.feature);
      this.paintFeature(event.feature)
    }

    paintFeature = (feature: Feature) => {
      let color = this.speedToColor(feature.getProperty('Type'), feature.getProperty('Velocity'))
      let weight

      if (feature.getProperty('Velocity') > 0) {
        weight = 3
      } else {
        weight = 1
      }

      this.map.data.overrideStyle(feature,
        {
          fillColor: '#00B22D',
          strokeColor: color,
          strokeOpacity: 1.0,
          strokeWeight: weight,
          originalWeight: weight,
          title: feature.getProperty('Name')
        })
    }

    createRoadPopup = (feature: Feature, clickPos: LatLng) => {
      let infoWindow = new this.googleMapsApi.InfoWindow()
      let html = '<div> <b> Weginformatie </b> </div>'
      html += '<div>Naam:' + feature.getProperty('Name') + '</div>'
      html += '<div>ID : ' + feature.getId() + '</div>'
      html += '<div>Lengte:  ' + feature.getProperty('Length') + ' meter</div>'
      html += '<div>Snelheid: ' + feature.getProperty('Velocity') + ' km/u</div>'
      html += '<div>Huidige reistijd: ' + Math.floor(feature.getProperty('Traveltime') / 60) + ':' + ('0' + feature.getProperty('Traveltime') % 60).slice(-2) + '</div>'
      html += '<div>Timestamp: ' + feature.getProperty('Timestamp') + '</div>'

      infoWindow.setContent(html)
      infoWindow.setPosition(clickPos)
      infoWindow.setOptions({ pixelOffset: new this.googleMapsApi.Size(0, -34) })
      infoWindow.open(this.map)
    }

    addFeatureEvent = (event: event) => {
      this.paintFeature(event.feature)
    }

    onComplete () {
      console.log('oncomplete in service')
    }

    speedToColor (type, speed) {
      let speedColors
      if (type === 'H') {
        // Highway
        speedColors = {
          0: '#D0D0D0',
          1: '#BE0000',
          30: '#FF0000',
          50: '#FF9E00',
          70: '#FFFF00',
          90: '#AAFF00',
          120: '#00B22D'
        }
      } else {
        // Other roads
        speedColors = {
          0: '#D0D0D0',
          1: '#BE0000',
          10: '#FF0000',
          20: '#FF9E00',
          30: '#FFFF00',
          40: '#AAFF00',
          70: '#00B22D'
        }
      }
      var currentColor = '#D0D0D0'
      for (var i in speedColors) {
        if (speed >= i) currentColor = speedColors[i]
      }
      return currentColor
    }
}
