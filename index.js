const incomeMessage = require('./src/messages/incomeMessage');

async function connectToWhatsApp(auth_whatsapp) {
    const { default: makeWAclientet, Browsers, makeInMemoryStore, DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState } = require('@adiwajshing/baileys');
    const pino = require('pino');
    const qrcode = require('qrcode-terminal');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_whatsapp');

    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

    store?.readFromFile('./baileys_store_multi.json')
    setInterval(() => {
        store?.writeToFile('./baileys_store_multi.json')
    }, 10_000)

    const logger = pino().child({ level: 'silent', stream: 'store' });
    const client = makeWAclientet({
        logger: pino({ level: 'silent', stream: 'store' }),
        printQRInTerminal: true,
        browser: Browsers.macOS("Desktop"),
        auth: state,
        getMessage: async key => {
			if(store) {
				const msg = await store.loadMessage(key.remoteJid, key.id);
				return msg?.message || undefined
			}

			// only if store is present
			return {
				conversation: 'hello'
			}
		}
    });
    const { ev: conn, ws } = client;

    store.bind(conn);

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

    conn.on("messages.upsert", async ({ messages }) => {
        const fromId = messages[0].key?.remoteJid;
        const fromMe = messages[0].key?.fromMe;
        if (!fromMe) {
            try {
                const quoted = messages[0];
                const isGroup = fromId.includes('g.us');
                const groupMetadata = isGroup ? await client.groupMetadata(fromId) : '';
                const participants = groupMetadata.participants || [];
                const messageType = Object.keys(messages[0].message)[0];
                if (messageType == 'conversation') {
                    const incomeText = messages[0].message?.conversation;
                    const reply = await incomeMessage.textHandle(incomeText, isGroup, participants) || { text: undefined };
                    if (reply[Object.keys(reply)[0]] != undefined) {
                        await client.sendMessage(fromId, reply, { quoted })
                    }
                } else if (messageType == 'extendedTextMessage') {
                    const textMessage = messages[0].message?.extendedTextMessage?.text;
                    const extendedMessage = messages[0].message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    const reply = await incomeMessage.extendedTextHandle(textMessage, extendedMessage, isGroup, participants) || { text: undefined };
                    if (reply[Object.keys(reply)[0]] != undefined) {
                        await client.sendMessage(fromId, reply, { quoted })
                    }
                } else if (messageType == 'imageMessage') {
                    const incomeText = messages[0].message?.imageMessage?.caption;
                    const imageMessage = messages[0].message;
                    const reply = await incomeMessage.imageHandle(incomeText, imageMessage) || { text: undefined };
                    if (reply[Object.keys(reply)[0]] != undefined) {
                        await client.sendMessage(fromId, reply, { quoted })
                    }
                }
            } catch (err) {
                console.log(err);
                try {
                    const fromId = messages[0].key?.remoteJid;
                    const quoted = messages[0];
                    const errorMessage = `Error reason : \n\n${err.message}\n\nReport bug ↓`
                    await client.sendMessage(fromId, { text: errorMessage }, { quoted });
                    const vcard = 'BEGIN:VCARD\n'
                        + 'VERSION:3.0\n'
                        + 'N:Akmal Dira\n'
                        + 'FN:Akmal Dira\n'
                        + 'item1.TEL;waid=6289699060906:+6289699060906\n'
                        + 'item1.X-ABLabel:Ponsel\n'
                        + 'item2.EMAIL;type=INTERNET:akmaldiraa@gmail.com\n'
                        + 'item2.X-ABLabel:Email\n'
                        + 'item3.URL:https://instagram.com/akmaldira\n'
                        + 'item3.X-ABLabel:Instagram\n'
                        + 'item4.URL:https://link.dana.id/qr/ixwle4b\n'
                        + 'item4.X-ABLabel:Dana (Gime duit)\n'
                        + 'END:VCARD';
                    const contact = { 
                        displayName: 'Akmal Dira', 
                        contacts: [
                            { 
                                displayName: 'Akmal Dira', 
                                vcard
                            }
                        ]
                    }
                    await client.sendMessage( fromId, {  contacts: contact } );
                } catch (err) {
                    
                }
            }
        }
    });
}

connectToWhatsApp('auth_whatsapp');
