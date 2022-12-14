const { connectToWhatsApp } = require('./src/config/client');
const incomeMessage = require('./src/messages/incomeMessage');

global.client;
global.conn;

async function connectionUpdate() {
    global.conn.on("messages.upsert", async ({ messages }) => {
        const fromId = messages[0].key?.remoteJid;
        const fromMe = messages[0].key?.fromMe;
        const quoted = messages[0];
        if (!fromMe) {
            await incomeMessage(global.client, messages[0]);
        }
    });
}

async function start() {
    const {client, conn} = await connectToWhatsApp('auth_whatsapp', global.client, global.conn);
    global.client = client;
    global.conn = conn;
    try {
        await connectionUpdate();
    } catch (err) {
        start();
    }
}

start();
