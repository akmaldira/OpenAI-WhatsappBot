global.client;
global.conn;


async function connectToWhatsApp(auth_whatsapp, gclient, gconn) {
    const { default: makeWAclientet, Browsers, makeInMemoryStore, DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState } = require('@adiwajshing/baileys');
    const pino = require('pino');
    const qrcode = require('qrcode-terminal');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_whatsapp');

    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

    const client = makeWAclientet({
        logger: pino({ level: 'silent', stream: 'store' }),
        printQRInTerminal: true,
        browser: Browsers.macOS("Desktop"),
        auth: state
    });
    const { ev: conn, ws } = client;

    store.bind(conn);

    gclient = client
    gconn = conn

    conn.on('connection.update', ({ qr, connection, lastDisconnect, isNewLogin }) => {
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