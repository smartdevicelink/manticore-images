/*
 * Copyright (c) 2019 Livio, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following
 * disclaimer in the documentation and/or other materials provided with the
 * distribution.
 *
 * Neither the name of the Livio Inc. nor the names of its contributors
 * may be used to endorse or promote products derived from this software
 * without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
*/

//a highly simplified policy server
const Koa = require('koa')
const app = new Koa()
const bodyParser = require('koa-bodyparser')
const Router = require('koa-router')
const cors = require('@koa/cors')
const fs = require('fs')
const util = require('util')
const Joi = require('joi')
const path = require('path')
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const ptPath = path.resolve(__dirname, 'pt.json')

app.use(cors())
app.use(bodyParser())
const router = new Router()

router.get('/', async (ctx, next) => {
    ctx.response.status = 200
})

//SDL Core hits this endpoint
router.post('/api/v1/production/policy', async (ctx, next) => {
    let table = JSON.parse(await readFile(ptPath))
    if (ctx.request.body.policy_table && ctx.request.body.policy_table.app_policies) {
      for (let appId in ctx.request.body.policy_table.app_policies) {
            if (appId !== "default" && appId !== "device" && appId !== "pre_DataConsent") {
                table.policy_table.app_policies[appId] = "default"
            }
        }  
    }
    
    ctx.response.body = {
        data: [table]
    }
    ctx.response.status = 200
})

const cloudPostSchema = Joi.object().keys({
    app_id: Joi.string().regex(/^[A-z0-9\-]+$/, 'Alphanumeric Plus Hyphens').required(),
    endpoint: Joi.string().regex(/^(wss?:\/\/)([A-z\d\.-]{2,}\.?([A-z]{2,})?)(:(\d{2,5}))?(\/[A-z\d\.-]+)*\/?$/, 'Websocket URL').required(),
    auth_token: Joi.string().allow('').required(),
    nicknames: Joi.array().items(Joi.string()).required()
})

//the Manticore UI hits this endpoint
router.post('/api/v1/cloud', async (ctx, next) => {
    const { body } = ctx.request

    const result = Joi.validate(body, cloudPostSchema)
    if (result.error) {
        ctx.response.status = 400
        return ctx.body = {
            error: result.error.message
        }
    }
    const input = result.value

    let table = JSON.parse(await readFile(ptPath))
    const appPolicyObj = createAppPolicyObj(input, input.endpoint.startsWith("wss"))

    //write the new object to the table and save it
    table.policy_table.app_policies[input.app_id] = appPolicyObj

    await writeFile(ptPath, JSON.stringify(table, null, 4))

    ctx.response.status = 200
})

function createAppPolicyObj (cloudPost, isSecure) {
    return {
        "keep_context": false,
        "steal_focus": false,
        "priority": "NONE",
        "default_hmi": "NONE",
        "groups": ["Base-4", "Location-1", "Notifications", "DrivingCharacteristics-3", "VehicleInfo-3", "PropriataryData-1", "PropriataryData-2", "ProprietaryData-3", "Emergency-1", "Navigation-1", "Base-6", "OnKeyboardInputOnlyGroup", "OnTouchEventOnlyGroup", "DiagnosticMessageOnly", "DataConsent-2", "BaseBeforeDataConsent", "SendLocation", "WayPoints", "BackgroundAPT", "Notifications-RC", "RemoteControl", "HapticGroup", "CloudApp", "AppServiceProducer", "AppServiceConsumer"],
        "moduleType": ["CLIMATE", "RADIO", "SEAT", "AUDIO", "LIGHT", "HMI_SETTINGS"],
        "RequestType": [],
        "RequestSubType": [],
        "hybrid_app_preference": "CLOUD",
        "enabled": true,
        "endpoint": cloudPost.endpoint,
        "auth_token": cloudPost.auth_token,
        "cloud_transport_type": isSecure ? "WSS" : "WS",
        "nicknames": cloudPost.nicknames        
    }
}

app.use(router.routes())

app.listen(9898)