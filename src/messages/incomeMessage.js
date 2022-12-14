const OpenAI = require('../lib/OpenAI');
const mediaHelper = require('../helper/mediaHelper');
const performance = require('perf_hooks').performance;

async function textHandle(incomeText, isGroup, participants) {
    const command = incomeText.split(' ')[0];
    if (command.toLowerCase() == '!image' || command.toLowerCase() == '!gambar') {
        const startProcess = performance.now();
        const imageUrl = await OpenAI.generateImage(incomeText.replace(command + ' ', ''));
        const endProcess = performance.now();
        let executingImageTime = endProcess - startProcess;
        executingImageTime = executingImageTime / 1000;
        return {
            image: { 
                url: imageUrl
            }, 
            caption: `*Execution time: ${executingImageTime.toFixed(2)} s*`
        }
    } else {
        if (isGroup) {
            if (command.toLowerCase() == '!ai') {
                const text = await OpenAI.freeText(incomeText.replace('!ai ', ''));
                return { 
                    text
                };
            } else if (command.toLowerCase() == '!member') {
                let text = 'List member :\n\n';
                const allParticipants = participants.map(i => i.id);
                for (let i = 0; i <= participants.length - 1; i++) {
                    text += `${i+1}. @${participants[i].id.split('@')[0]}\n`
                }
                return { 
                    text,
                    mentions: allParticipants
                };
            }
        } else {
            const text = await OpenAI.freeText(incomeText.replace('!ai ', ''));
            return { 
                text
            };
        }
    }
}

async function imageHandle(textMessage, imageMessage) {
    switch (textMessage.toLowerCase()) {
        case '!sticker':
        case '!stiker':
            const startProcess = performance.now();
            const mediaData = await mediaHelper.getMedia(imageMessage, 'imageMessage');
            const sticker = await mediaHelper.createStickerWithMediaData(mediaData);
            const endProcess = performance.now();
            let executingImageTime = endProcess - startProcess;
            executingImageTime = executingImageTime / 1000;
            return {
                sticker
            }
        default:
            break;
    }
}

async function extendedTextHandle(textMessage, extendedMessage, isGroup, participants) {
    if (extendedMessage) {
        const extendedMessageType = Object.keys(extendedMessage)[0];
        switch (extendedMessageType) {
            case 'conversation':
                let incomeText = textMessage.toLowerCase() + '\n\n' + extendedMessage.conversation.replace('*ChatBot OpenAI*', '').trim();
                let reply = await textHandle(incomeText, isGroup, participants);
                return reply;
            case 'imageMessage':
                let replyI = await imageHandle(textMessage, extendedMessage);
                return replyI;
            case 'extendedTextMessage':
                console.log(extendedMessage);
                if (textMessage.includes('tag')) {
                    let incomeText = textMessage.toLowerCase() + '\n\n' + extendedMessage.extendedTextMessage.text.replace('*ChatBot OpenAI*', '').trim();
                    let reply = await textHandle(incomeText, isGroup);
                    const phoneValidation = /[\@]?[[0-9]]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/
                    const res = reply.text.match(phoneValidation)
                    if (res != null) {
                        const tag = res[0].split('@')[1] + '@s.whatsapp.net'
                        reply.mentions = [tag];
                    } else {
                        reply.text += '\n\nCant tag person'
                    }
                    return reply;
                } else {
                    let incomeText = textMessage.toLowerCase() + '\n\n' + extendedMessage.extendedTextMessage.text.replace('*ChatBot OpenAI*', '').trim();
                    let reply = await textHandle(incomeText, isGroup);
                    return reply;
                }
            default:
                break;
        }
    } else {
        const reply = await textHandle(textMessage, isGroup);
        return reply;
    }
}

async function incomeMessage(client, messages) {
    try {
        const fromId = messages.key?.remoteJid;
        const isGroup = fromId.includes('g.us');
        const groupMetadata = isGroup ? await client.groupMetadata(fromId) : '';
        const participants = groupMetadata.participants || [];
        const quoted = messages;
        const messageType = Object.keys(messages.message)[0];
        if (messageType == 'conversation') {
            const incomeText = messages.message?.conversation;
            const reply = await textHandle(incomeText, isGroup, participants) || { text: undefined };
            console.log(reply);
            if (reply[Object.keys(reply)[0]] != undefined) {
                await client.sendMessage(fromId, reply, { quoted })
            }
        } else if (messageType == 'extendedTextMessage') {
            const textMessage = messages.message?.extendedTextMessage?.text;
            const extendedMessage = messages.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const reply = await extendedTextHandle(textMessage, extendedMessage, isGroup, participants) || { text: undefined };
            if (reply[Object.keys(reply)[0]] != undefined) {
                await client.sendMessage(fromId, reply, { quoted })
            }
        } else if (messageType == 'imageMessage') {
            const incomeText = messages.message?.imageMessage?.caption;
            const imageMessage = messages.message;
            const reply = await imageHandle(incomeText, imageMessage);
            if (reply[Object.keys(reply)[0]] != undefined) {
                await client.sendMessage(fromId, reply, { quoted })
            }
        }
    } catch (err) {
        const fromId = messages.key?.remoteJid;
        const quoted = messages;
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
    }
}

module.exports = incomeMessage;