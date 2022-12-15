const OpenAI = require('../lib/OpenAI');
const mediaHelper = require('../helper/mediaHelper');
const performance = require('perf_hooks').performance;

exports.textHandle = textHandle = async(incomeText, isGroup, participants) => {
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

exports.imageHandle = imageHandle = async(textMessage, imageMessage) => {
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

exports.extendedTextHandle = extendedTextHandle = async(textMessage, extendedMessage, isGroup, participants) => {
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