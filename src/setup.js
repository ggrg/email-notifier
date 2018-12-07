/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>
 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 --------------
 ******/

'use strict'

/**
 * @module src/setup
 */

const Consumer = require('./lib/kafka/consumer')
const Utility = require('./lib/utility')
const Logger = require('@mojaloop/central-services-shared').Logger
const Rx = require('rxjs')
const { filter, switchMap } = require('rxjs/operators')
const Observables = require('./observables')
const createHealtcheck = require('healthcheck-server')
const Config = require('./lib/config')

const setup = async () => {
  await Consumer.registerNotificationHandler()
  const topicName = Utility.transformGeneralTopicName(Utility.ENUMS.NOTIFICATION, Utility.ENUMS.EVENT)
  const consumer = Consumer.getConsumer(topicName)

  createHealtcheck({
    port: Config.get('healthCheckPort'),
    path: '/healthcheck',
    status: ({cpu, memory}) => {
      if (consumer._status.running) return true
      else return false
    }
  })

  const topicObservable = Rx.Observable.create((observer) => {
    consumer.on('message', async (data) => {
      Logger.info(`Central-Event-Processor :: Topic ${topicName} :: Payload: \n${JSON.stringify(data.value, null, 2)}`)
      observer.next(data)
      if (!Consumer.isConsumerAutoCommitEnabled(topicName)) {
        consumer.commitMessageSync(data)
      }
    })
  })

  const emailNotification = topicObservable
    .pipe(filter(data => data.value.from === 'SYSTEM'),
      switchMap(Observables.actionObservable))

  emailNotification.subscribe(result => {
    Logger.info(result)
  })
}

module.exports = {
  setup
}
