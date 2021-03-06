<template>
    <v-container fluid>
    <v-card class="mx-auto mt-5">
      <v-card-title>
        <h1 class="display-1">Smart city map</h1>
      </v-card-title>
          <div id="myMap"/>
        <v-card-title>  <h1 class="display-1">Display date</h1> </v-card-title>
      <v-card-text>

        <v-form>
          <v-text-field
            label="Replay interval:"
            prepend-icon="mdi-account-circle"
          />

          <v-text-field
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            prepend-icon="mdi-lock"
            :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append="showPassword = !showPassword"
          />

        </v-form>
      </v-card-text>
      <v-divider></v-divider>

      <v-card-actions>
        <v-btn color="success">Register</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="info">Login</v-btn>
      </v-card-actions>
    </v-card>
    </v-container>
</template>

<script>
import Vue from 'vue'
import MapLoader from '../cityservice/MapLoader'
import RSocketGeojsonClient from '../cityservice/RsocketGeojsonClient'
import TravelTimeService from '../cityservice/TravelTime'
import moment from 'moment'

const STREAM_LIVE = 'TRAVELTIME_STREAM'
const STREAM_HISTORY = 'TRAVELTIME_REPLAY_MINIMAL'

const url = 'ws://localhost:9897/rsocket'
const key = 'AIzaSyB6SSvjmmzWA9zOVHhh4IsBbp3qqY25qas'

export default Vue.extend({
  name: 'MapMinimal',
  roadService: undefined,

  data () {
    return {
      top: true,
      toggle_one: 0,
      startReplay: false,
      startLive: false,
      pauseReplay: false,
      errorNotification: false,
      errorDescription: '',
      roadService: this.roadService,
      replayMetaData: { currentPlayedDate: undefined, replaySpeed: 3000 }
    }
  },
  filters: {
    dateFilter: function (date) {
      return moment.utc(date).format('HH:mm:ss (Do MMM)')
    }
  },
  mounted: async function () {
    let map
    let googleMapsApi

    try {
      googleMapsApi = await MapLoader.getGoogleMapsApi(key)
      map = await MapLoader.createMap(googleMapsApi)
    } catch (error) {
      console.error('Error loading map. ' + error)
      this.errorDescription = 'Error loading map. ' + error
      this.errorNotification = true
    }
    try {
      this.roadService = new TravelTimeService(
        map,
        googleMapsApi,
        new RSocketGeojsonClient(url)
      )
      await this.roadService.liveSubscription(STREAM_LIVE)
    } catch (error) {
      console.error(error)
      this.errorDescription = error
      this.errorNotification = true
    }
  },
  methods: {
    async streamLive () {
      this.top = true
      try {
        this.startLive = true
        this.startReplay = false
        await this.roadService.liveSubscription(STREAM_LIVE)
      } catch (error) {
        console.error(error)
        this.errorDescription = error
        this.errorNotification = true
      }
    },
    async streamHistory () {
      this.top = true
      this.startReplay = true
      try {
        await this.roadService.replaySubscription(STREAM_HISTORY, this.replayMetaData)
      } catch (error) {
        console.error(error)
        this.errorDescription = error
        this.errorNotification = true
        this.startReplay = false
      }
    },

    async streamPause () {
      this.top = true
      this.pauseReplay = true
      try {
        await this.roadService.playPause()
      } catch (error) {
        console.error(error)
        this.errorDescription = error
        this.errorNotification = true
      }
    },
    async test () {
      this.roadService.cancelSubscription()

      this.top = true
      try {
        await this.roadService.test()
      } catch (error) {
        console.error(error)
        this.errorDescription = error
        this.errorNotification = true
      }
    },

    async streamRewind () {
      this.interval--
    },

    async streamFastforward () {
      this.interval++
    }
  }
})
</script>
<style scoped>
  #myMap {
    height: 600px;
    width: 100%;
  }
</style>
