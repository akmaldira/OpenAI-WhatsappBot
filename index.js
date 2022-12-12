const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const rimraf = require('rimraf');
const fs = require('fs');
const OpenAI = require('./lib/OpenAI');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_whatsapp");
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: Browsers.macOS("Desktop"),
    });

    sock.public = true
  
    sock.ev.on("connection.update", async(update) => {
        const { connection, lastDisconnect } = update
        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); sock.logout(); }
            else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); sock.logout(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Scan Again And Run.`); sock.logout(); }
            else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); connectToWhatsApp(); }
            else if (reason === DisconnectReason.multideviceMismatch) { console.log("Multi device mismatch, please scan again"); sock.logout(); }
            else sock.end(`Unknown DisconnectReason: ${reason}|${connection}`)
        } else if (connection == 'connecting') {
            console.log('Connecting...');
        } else {
            console.log('Connect')
        }
    });

    sock.ev.on('creds.update', saveCreds)
  
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const remoteJid = messages[0].key.remoteJid;
        const messageBody = messages[0].message?.conversation;
        const isCommand = messageBody[0] == '!';
        if (isCommand) {
            const command = messageBody.split(' ')[0];
            const message = messageBody.replace(command+' ', '');
            let text;
            if (command == '!ai') {
                text = await OpenAI.freeText(message+'\n');
            }
            await sock.sendMessage(remoteJid, { text: text });
        }
    });
}

connectToWhatsApp();