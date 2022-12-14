global.client;
global.conn;


async function connectToWhatsApp(auth_whatsapp, gclient, gconn) {
    const { default: makeWAclientet, Browsers, DisconnectReason, makeCacheableSignalKeyStore, makeInMemoryStore, useMultiFileAuthState } = require('../../Baileys/lib');
    const { Boom } = require('@hapi/boom');
    const pino = require('pino');
    const qrcode = require('qrcode-terminal');

    
    const { state, saveCreds } = await useMultiFileAuthState(auth_whatsapp);

    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

    const client = makeWAclientet({
        logger: pino({ level: 'silent', stream: 'store' }),
        printQRInTerminal: true,
        browser: Browsers.macOS("Desktop"),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'silent', stream: 'store' }))
        }
    });

    const { ev: conn, ws } = client;

    store.bind(conn);

    gclient = client
    gconn = conn

    conn.on('connection.update', ({ qr, connection, lastDisconnect, isNewLogin }) => {
        require('./update');
        if (qr) {
            console.log('Scan QR to login');
        }
        if (connection) {
            if (connection == 'close') {
                if (lastDisconnect?.error?.output.statusCode != DisconnectReason.loggedOut) {
                    connectToWhatsApp(auth_whatsapp);
                } else {
                    console.log('Logout', connection)
                }
            }
            console.log('Status:', connection)
        }

        if (isNewLogin) {
            console.log('Success connect')
        }
    });

    conn.on('messages.upsert', m => {
        require('./update')
    });

    ws.on('CB:success', () => {
        console.log('Status: connected')
        conn.emit('login:success')
    });

    conn.on('creds.update', saveCreds)

    return new Promise(resolve => {
        resolve({
           client: client,
           conn: conn
        })
    })
}

module.exports = { connectToWhatsApp: connectToWhatsApp }