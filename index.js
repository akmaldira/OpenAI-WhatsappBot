const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState, makeInMemoryStore, MessageType } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const performance = require('perf_hooks').performance;
const fs = require('fs');
const OpenAI = require('./lib/OpenAI');
const BotHelper = require('./lib/BaileysHelper');
const dotenv = require('dotenv');
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
        const fromMe = messages[0].key.fromMe;
        const remoteJid = messages[0].key.remoteJid;
        const messageBody = messages[0].message?.conversation;
        const quoted = messages[0];
        let text;
        let imageUrl;
        if (!fromMe) {
            try {
                switch (messageBody.split(' ')[0].toLowerCase()) {
                    case 'image':
                    case 'gambar':
                        text = 'Processing...'
                        const startImage = performance.now();
                        await BotHelper.replyMessage(sock, remoteJid, text, quoted)
                        imageUrl = await OpenAI.generateImage(messageBody);
                        const endImage = performance.now();
                        let executingImageTime = endImage - startImage;
                        executingImageTime = executingImageTime / 1000;
                        await BotHelper.sendImage(sock, remoteJid, imageUrl, `*Execution time: ${executingImageTime.toFixed(2)} s*`, { quoted })
                        break;
                    case 'sticker':
                    case 'stiker':
                        await BotHelper.replyMessage(sock, remoteJid, 'Feature soon!', quoted);
                        break;
                    case 'help':
                    case 'tolong':
                        if (messageBody.split(' ')[1] == undefined) {
                            text = 'Hi there...\n\n'
                                + 'Open AI Features\n'
                                + '1. send any text //ChatBot OpenAI\n'
                                + '2. *image* your text //to generate image\n'
                                + '3. *sticker* or *stiker* //image to sticker\n\n'
                                + 'more? as soon as possible\n\n'
                                + 'Request feature or report bug ↓'
                            
                            await BotHelper.replyMessage(sock, remoteJid, text, quoted);
                            await BotHelper.sendAuthorContact(sock, remoteJid);
                        }
                        break;
                    default:
                        text = await OpenAI.freeText(messageBody);
                        await BotHelper.replyMessage(sock, remoteJid, text, quoted);
                        break;
                }
            } catch (err) {
                await BotHelper.sendMessage(sock, remoteJid, 'Error reason :\n\n' + err.message + '\n\nReport bug ↓');
                await BotHelper.sendAuthorContact(sock, remoteJid);
            }
        }
    });
}

connectToWhatsApp();