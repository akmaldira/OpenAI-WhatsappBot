const { createSticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadContentFromMessage } = require('@adiwajshing/baileys');

exports.createStickerWithMediaData = async(mediaData) => {
    const stickerOptions = {
        pack: 'whoami?',
        author: 'who?',
        type: StickerTypes.FULL,
        quality: 50,
    }
    const generateSticker = await createSticker(mediaData, stickerOptions);
    return generateSticker;
}

exports.getMedia = async (message, messageType) => {
    const stream = await downloadContentFromMessage(message[messageType], messageType.replace('Message', ''))
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}