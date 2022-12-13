const performance = require('perf_hooks').performance;
const outComeMessageHelper = require('./outcomeMessage');
const OpenAI = require('../OpenAI/index');
const MediaHelper = require('../../utils/Media/index');

exports.conversationHandle = async( sock, remoteJid, incomeText, quoted, isGroup ) => {
    let text;
    switch (incomeText.split(' ')[0].toLowerCase()) {
        case 'image':
        case 'gambar':
            text = 'Processing...'
            const startImage = performance.now();
            await outComeMessageHelper.replyMessage(sock, remoteJid, text, quoted)
            imageUrl = await OpenAI.generateImage(incomeText);
            const endImage = performance.now();
            let executingImageTime = endImage - startImage;
            executingImageTime = executingImageTime / 1000;
            await outComeMessageHelper.sendImage(sock, remoteJid, imageUrl, `*Execution time: ${executingImageTime.toFixed(2)} s*`, { quoted })
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
                
                await outComeMessageHelper.replyMessage(sock, remoteJid, text, quoted);
                await outComeMessageHelper.sendAuthorContact(sock, remoteJid);
            }
            break;
        default:
            if (isGroup) {
                if (incomeText.toLowerCase().split(' ')[0] == 'woi' && incomeText.toLowerCase().split(' ')[1] == 'bot') {
                    text = await OpenAI.freeText(incomeText.replace('woi bot ', ''));
                    await outComeMessageHelper.replyMessage(sock, remoteJid, text, quoted);
                }
            } else {
                text = await OpenAI.freeText(incomeText);
                await outComeMessageHelper.replyMessage(sock, remoteJid, text, quoted);
            }
            break;
    }
}

exports.imageMessageHandle = async(sock, remoteJid, imageMessage, text, quoted) => {
    switch (text.toLowerCase()) {
        case 'sticker':
        case 'stiker':
            const startImage = performance.now();
            await outComeMessageHelper.replyMessage(sock, remoteJid, 'Processing...', quoted);
            const mediaData = await MediaHelper.getMedia(imageMessage, 'imageMessage');
            const sticker = await MediaHelper.createStickerWithMediaData(mediaData);
            const endImage = performance.now();
            let executingImageTime = endImage - startImage;
            executingImageTime = executingImageTime / 1000;
            await outComeMessageHelper.sendMedia(sock, remoteJid, { sticker });
            await outComeMessageHelper.replyMessage(sock, remoteJid, `*Execution time: ${executingImageTime.toFixed(2)} s*`, quoted);
            break;
        default:
            break;
    }
}