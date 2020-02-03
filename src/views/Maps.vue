<template>
  <v-app>

    <!------  Notification---------------------------------------------->
    <v-snackbar v-model="errorNotification" :top=true>
      <v-icon size="500" @click="errorNotification = false"></v-icon>
      <v-alert type="error">
        <b>Error: </b> {{errorDescription}}
      </v-alert>
    </v-snackbar>
    <!--          <v-snackbar v-model="startLive" :top="top" dark>-->
    <!--            <div>-->
    <!--              <b> Livestream started </b>-->
    <!--            </div>-->
    <!--            <v-icon size="100" @click="startReplay = false"></v-icon>-->
    <!--          </v-snackbar>-->

    <!------------------------------------------------------------------->
    <v-container class="ma-0 pa-0" fluid elevation="6">
      <!--      <v-card class="ma-0 pa-0">-->

      <v-row>
        <div id="myMap"/>
      </v-row>
      <!--        <v-card-text elevation="6">-->
      <!--        </v-card-text>-->

      <v-row>
        <v-col cols="5">
          <v-btn :color="startReplay ?  'grey' : 'success'" @click="streamLive()">
            Live stream
          </v-btn>

          <v-btn :color="startReplay ? 'success' : 'grey' " @click="streamHistory()">
            Start Replay
          </v-btn>
        </v-col>
        <template v-if="startReplay === true">

            <v-col cols="3">
              <template v-if="!replayMetaData.connInitialized">

               Connecting...
                <v-row align="justify-self">
                  <v-progress-linear
                    active=true
                    indeterminate=true
                    color="deep-purple accent-4"
                    height="8"
                  ></v-progress-linear>
                </v-row>

              </template>
                <v-container>
                  <v-row
                    class="fill-height"
                  >
                    <v-scale-transition>
                      <div
                        v-if="replayMetaData.connInitialized"
                        class="text-center"
                      >
                        <v-btn-toggle v-model="toggle_one" mandatory>

                          <v-btn :color="pauseReplay ? 'success' : 'grey' " @click="streamPause()" small>
                            {{pauseResume}}
                          </v-btn>
                          <v-btn :color="rewindReplay ? 'success' : 'grey' " @click="streamRewind()" small>
                            Rewind
                          </v-btn>
                          <v-btn :color="forwardReplay ? 'success' : 'grey' " @click="streamFastForward()" small>
                            Fast Forward
                          </v-btn>
                          <v-col cols="4">
                            <v-label>
                              <p>
                                <input v-model="replayMetaData.replaySpeed">
                              </p>
                            </v-label>
                          </v-col>
                          <v-row>
                            <v-label><h1 class="display-1"> Display Time: {{replayMetaData.currentPlayedDate | dateFilter }} </h1>
                            </v-label>
                          </v-row>
                        </v-btn-toggle>
                      </div>
                    </v-scale-transition>
                  </v-row>
                </v-container>
            </v-col>
        </template>
      </v-row>
    </v-container>

  </v-app>
</template>

<script>
import MapLoader from '../cityservice/MapLoader'
import RSocketGeojsonClient from '../cityservice/RsocketGeojsonClient'
import TravelTimeService from '../cityservice/TravelTime'
import * as moment from 'moment'

const STREAM_LIVE = 'TRAVELTIME_STREAM'
const STREAM_HISTORY = 'TRAVELTIME_REPLAY_MINIMAL'

const url = 'ws://localhost:9897/rsocket'
const key = 'AIzaSyB6SSvjmmzWA9zOVHhh4IsBbp3qqY25qas'

export default {
  name: 'App',
  roadService: undefined,
  data () {
    return {
      toggle_one: 0,
      startReplay: false,
      startLive: false,
      pauseReplay: false,
      rewindReplay: false,
      forwardReplay: false,
      pauseResume: 'pause',
      startReset: 'Start replay',
      errorNotification: false,
      errorDescription: '',
      roadService: this.roadService,
      replayMetaData: { currentPlayedDate: undefined, replaySpeed: 3000, connInitialized: false }
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
        new RSocketGeojsonClient(url),
        this.replayMetaData
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
      try {
        await this.roadService.replaySubscription(STREAM_HISTORY, this.replayMetaData)
      } catch (error) {
        console.error(error)
        this.errorDescription = error
        this.errorNotification = true
      }
      this.startReplay = true
      this.startLive = false
    },
    async streamPause () {
      this.forwardReplay = false
      this.rewindReplay = false
      this.pauseReplay = true
      try {
        await this.roadService.playPause()
      } catch (error) {
        console.error(error)
        this.errorDescription = error
        this.errorNotification = true
      }
    },
    async streamRewind () {
      this.forwardReplay = false
      this.rewindReplay = true
      this.pauseReplay = false
      this.interval--
    },
    async streamFastForward () {
      this.forwardReplay = true
      this.rewindReplay = false
      this.pauseReplay = false
      this.interval++
    },

    async test () {
      this.roadService.cancelSubscription()

      try {
        await this.roadService.test()
      } catch (error) {
        console.error(error)
        this.errorDescription = error
        this.errorNotification = true
      }
    }

  }
}
</script>
<style scoped>
  #myMap {
    height: 800px;
    width: 100%;
  }
</style>
