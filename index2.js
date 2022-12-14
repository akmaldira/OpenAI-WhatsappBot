const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState, MessageType } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const performance = require('perf_hooks').performance;
const MediaHelper = require('./src/utils/mediaHelper');
const OpenAI = require('./lib/OpenAI');
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
        const remoteJid = messages[0].key.remoteJid;
        const quoted = messages[0];
        try {
            const messageType = Object.keys(messages[0].message)[0];
            if (!messages[0].key.fromMe) {
                switch (messageType) {
                    case 'conversation':
                        let isGroup = false;
                        messages[0].key.participant == undefined ? isGroup = false : isGroup = true;
                        const incomeText = messages[0].message?.conversation;
                        switch (incomeText.split(' ')[0].toLowerCase()) {
                            case 'image':
                            case 'gambar':
                                const startImage = performance.now();
                                await sock.sendMessage( remoteJid, { text: 'Processing...' }, { quoted } );
                                imageUrl = await OpenAI.generateImage(incomeText);
                                const endImage = performance.now();
                                let executingImageTime = endImage - startImage;
                                executingImageTime = executingImageTime / 1000;
                                await sock.sendMessage( remoteJid, { image: { url: imageUrl }, caption: `*Execution time: ${executingImageTime.toFixed(2)} s*` }, { quoted } );
                                break;
                            case 'help':
                            case 'tolong':
                                if (incomeText.split(' ')[1] == undefined) {
                                    text = 'Hi there...\n\n'
                                        + 'Open AI Features\n'
                                        + '1.a. send any text //ChatBot OpenAI\n'
                                        + '1.b. *woi bot* your text //ChatBot OpenAI in group\n'
                                        + '2. *image* your text //to generate image\n'
                                        + '3. *sticker* or *stiker* //image to sticker\n\n'
                                        + 'more? as soon as possible\n\n'
                                        + 'Request feature or report bug ↓'
                                    
                                    await sock.sendMessage( remoteJid, { text }, { quoted } );
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
                                    await sock.sendMessage( remoteJid, {  contacts: contact } );
                                }
                                break;
                            default:
                                if (isGroup) {
                                    if (incomeText.toLowerCase().split(' ')[0] == 'woi' && incomeText.toLowerCase().split(' ')[1] == 'bot') {
                                        text = await OpenAI.freeText(incomeText.replace('woi bot ', ''));
                                        await sock.sendMessage( remoteJid, { text }, { quoted } );
                                    } else if (incomeText.toLowerCase().split(' ')[0] == 'member') {
                                        const chatId = messages[0].key?.id;
                                        console.log();
                                        const groupMetadata = await sock.groupMetadata(chatId)
                                        const participants = groupMetadata.participants.map(i => i.id)
                                        await sock.sendMessage(remoteJid, {
                                        text: 'text', 
                                        mentions: participants
                                        })
                                    }
                                } else {
                                    text = await OpenAI.freeText(incomeText);
                                    await sock.sendMessage( remoteJid,{ text }, { quoted } );
                                }
                                break;
                        }
                        break;
                    case 'imageMessage':
                        const imageMessage = messages[0].message;
                        const caption = messages[0].message?.imageMessage?.caption;
                        switch (caption.toLowerCase()) {
                            case 'sticker':
                            case 'stiker':
                                const startImage = performance.now();
                                await sock.sendMessage( remoteJid, { text: 'Processing...' }, { quoted } );
                                const mediaData = await MediaHelper.getMedia(imageMessage, 'imageMessage');
                                const sticker = await MediaHelper.createStickerWithMediaData(mediaData);
                                const endImage = performance.now();
                                let executingImageTime = endImage - startImage;
                                executingImageTime = executingImageTime / 1000;
                                await sock.sendMessage( remoteJid, { sticker } );
                                await sock.sendMessage( remoteJid, { text: `*Execution time: ${executingImageTime.toFixed(2)} s*` }, { quoted } );
                                break;
                            default:
                                break;
                        }
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
                                    if (isGroup) {
                                        if (incomeText.toLowerCase().split(' ')[0] == 'woi' && incomeText.toLowerCase().split(' ')[1] == 'bot') {
                                            text = await OpenAI.freeText(incomeText.replace('woi bot ', ''));
                                            await sock.sendMessage( remoteJid, { text }, { quoted } );
                                        }
                                    } else {
                                        text = await OpenAI.freeText(incomeText);
                                        await sock.sendMessage( remoteJid,{ text }, { quoted } );
                                    }
                                    break;
                                case 'imageMessage':
                                    switch (textMessage.toLowerCase()) {
                                        case 'sticker':
                                        case 'stiker':
                                            const startImage = performance.now();
                                            await sock.sendMessage( remoteJid, { text: 'Processing...' }, { quoted } );
                                            const mediaData = await MediaHelper.getMedia(extendedMessage, 'imageMessage');
                                            const sticker = await MediaHelper.createStickerWithMediaData(mediaData);
                                            const endImage = performance.now();
                                            let executingImageTime = endImage - startImage;
                                            executingImageTime = executingImageTime / 1000;
                                            await sock.sendMessage( remoteJid, { sticker } );
                                            await sock.sendMessage( remoteJid, { text: `*Execution time: ${executingImageTime.toFixed(2)} s*` }, { quoted } );
                                            break;
                                        default:
                                            break;
                                    }
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
            console.log(err);
            const errorMessage = `Error reason : \n\n${err.message}\n\nReport bug ↓`
            await sock.sendMessage( remoteJid, { errorMessage }, { quoted } );
        }
    });
}

const app = connectToWhatsApp();

module.exports = app;