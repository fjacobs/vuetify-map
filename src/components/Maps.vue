<template>
  <v-container
    fill-height
    fluid
    grid-list-xl
  >
    <v-layout
      justify-center
      align-center
    >
      <v-flex md12>
        <material-card
          color="black"
          title="Smart City - Amsterdam"
          text="Road information"
        >

          <!------  Notification---------------------------------------------->
          <v-snackbar v-model="errorNotification" :top="top">
            <div>
              <b> {{errorDescription}}</b>
            </div>
            <v-icon size="500" @click="errorNotification = false"></v-icon>
            <v-alert type="error">
              I'm an error alert.
            </v-alert>
          </v-snackbar>

          <v-snackbar v-model="pauseReplay" :top="top" dark>
            <div>
              <b> Replay paused/started </b>
            </div>
            <v-icon size="100" @click="pauseReplay = false"></v-icon>
          </v-snackbar>

          <!--          <v-snackbar v-model="startLive" :top="top" dark>-->
          <!--            <div>-->
          <!--              <b> Livestream started </b>-->
          <!--            </div>-->
          <!--            <v-icon size="100" @click="startReplay = false"></v-icon>-->
          <!--          </v-snackbar>-->

          <!------------------------------------------------------------------->

          <div class="maps">
            <div id="myMap"/>
          </div>

          <v-container fluid>

            <v-row>
              <v-col cols="12" sm="6" class="py-2">

                <v-btn color="success" @click="streamLive()">
                  Live stream
                </v-btn>

                <p>Replay control</p>

                <v-btn color="success" @click="streamHistory()">
                  Start/Reset
                </v-btn>

                <template v-if="startReplay === true">
                  <v-btn-toggle v-model="toggle_one" shaped mandatory>
                    <v-col cols="12" sm="6" class="py-2">

                      <v-btn color="success" @click="streamRewind()">
                        Rewind
                      </v-btn>
                      <v-btn color="success" @click="streamPause()">
                        Pause/Resume
                      </v-btn>

                      <v-btn color="success" @click="streamFastforward()">
                        Fast Forward
                      </v-btn>
                      <v-label > Display date: {{replayMetaData.currentPlayedDate | dateFilter }}</v-label>

                      <input v-model="replayMetaData.replaySpeed" >

                      <!--                    <v-text-field-->
                      <!--                        class="purple-input"-->
                      <!--                        label="Replay speed"-->
                      <!--                    />-->
                    </v-col>

                  </v-btn-toggle>

                  <br>

                </template>
              </v-col>

            </v-row>

          </v-container>
        </material-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import 'moment'

import MapLoader from '../cityservice/MapLoader.ts'
import RSocketGeojsonClient from '../cityservice/RsocketGeojsonClient.ts'
import TravelTimeService from '../cityservice/TravelTime.ts'

const STREAM_LIVE = 'TRAVELTIME_STREAM'
const STREAM_HISTORY = 'TRAVELTIME_REPLAY_MINIMAL'

const url = 'ws://localhost:9897/rsocket'
const key = 'AIzaSyB6SSvjmmzWA9zOVHhh4IsBbp3qqY25qas'

export default {
  name: 'Maps',
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
}
</script>
<style scoped>
  #myMap {
    height: 600px;
    width: 100%;
  }
</style>
