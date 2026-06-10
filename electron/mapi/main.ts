import app from './app/main'
import config from './config/main'
import db from './db/main'
import event from './event/main'
import file from './file/main'
import { HttpServer } from './httpserver/main'
import keys from './keys/main'
import kvdb from './kvdb/main'
import log from './log/main'
import manager from './manager/main'
import misc from './misc/main'
import protocol from './protocol/main'
import storage from './storage/main'
import ui from './ui'
import updater from './updater/main'
import user from './user/main'

const $mapi = {
    app,
    log,
    config,
    storage,
    db,
    file,
    event,
    ui,
    keys,
    user,
    misc,
    protocol,
    updater,
    manager,
    kvdb,
}

export const MAPI = {
    async init() {
        await $mapi.user.init()
        await $mapi.db.init()
        await $mapi.event.init()
        $mapi.kvdb.init()
        $mapi.manager.init()
        HttpServer.start().then()
    },
    ready() {
        $mapi.keys.ready()
        $mapi.manager.ready()
        $mapi.protocol.ready()
    },
    destroy() {
        $mapi.keys.destroy()
        $mapi.manager.destroy()
    },
}
