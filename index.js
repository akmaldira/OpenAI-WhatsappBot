const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState, MessageType } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const outComeMessageHelper = require('./lib/BaileysHelper/outcomeMessage');
const dotenv = require('dotenv');
const incomeMessageHandler = require('./lib/BaileysHelper/incomeMessage');
dotenv.config();

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_whatsapp");
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: Browsers.macOS("Desktop"),
    });

    const deleteAuthDir = async() => {
        fs.rm("auth_whatsapp", { recursive: true, force: true }, (err) => {
            if (err) {
                return console.log("Error deleting auth folder", err);
            }
            console.log("Auth folder deleted successfully");
        });
    }

    sock.public = true;

    sock.ev.on("connection.update", async(update) => {
        const { connection, lastDisconnect } = update
        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); sock.logout(); }
            else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); sock.logout(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Scan Again And Run.`); await deleteAuthDir(); connectToWhatsApp(); }
            else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.multideviceMismatch) { console.log("Multi device mismatch, please scan again"); sock.logout(); }
            else sock.end(`Unknown DisconnectReason: ${reason}|${connection}`)
        } else if (connection == 'connecting') {
            console.log('Try to connect');
        } else {
            console.log('Connected')
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const remoteJid = messages[0].key.remoteJid;
        const quoted = messages[0];
        let text;
        let imageUrl;
        try {
            const messageType = Object.keys(messages[0].message)[0];
            if (!messages[0].key.fromMe) {
                switch (messageType) {
                    case 'conversation':
                        let isGroup = false;
                        messages[0].key.participant == undefined ? isGroup = false : isGroup = true;
                        const incomeText = messages[0].message?.conversation;
                        await incomeMessageHandler.conversationHandle(sock, remoteJid, incomeText, quoted, isGroup);
                        break;
                    case 'imageMessage':
                        const imageMessage = messages[0].message;
                        const caption = messages[0].message?.imageMessage?.caption;
                        await incomeMessageHandler.imageMessageHandle(sock, remoteJid, imageMessage, caption, quoted);
                        break;
                    case 'stickerMessage':
                        
                        break;
                    case 'extendedTextMessage':
                        const textMessage = messages[0].message?.extendedTextMessage?.text;
                        const extendedMessage = messages[0].message?.extendedTextMessage?.contextInfo?.quotedMessage;
                        if (extendedMessage) {
                            const extendedMessageType = Object.keys(extendedMessage)[0];
                            switch (extendedMessageType) {
                                case 'conversation':
                                    let isGroup = false;
                                    messages[0].key.participant == undefined ? isGroup = false : isGroup = true;
                                    const incomeText = textMessage.toLowerCase() + '\n\n' + extendedMessage.conversation.replace('*ChatBot OpenAI*', '').trim();
                                    await incomeMessageHandler.conversationHandle(sock, remoteJid, incomeText, quoted, isGroup); 
                                    break;
                                case 'imageMessage':
                                    await incomeMessageHandler.imageMessageHandle(sock, remoteJid, extendedMessage, textMessage, quoted );
                                    break;
                                case 'stickerMessage':
        
                                    break;
                                default:
                                    break;
                            }
                        }
                        break;
                    default:
                        break;
                }
            }
        } catch (err) {
            const errorMessage = `Error reason : \n\n${err.message}\n\nReport bug ↓`
            await outComeMessageHelper.replyMessage(sock, remoteJid, errorMessage, quoted)
            await outComeMessageHelper.sendAuthorContact(sock, remoteJid);
        }
    });
}

const app = connectToWhatsApp();

module.exports = app;