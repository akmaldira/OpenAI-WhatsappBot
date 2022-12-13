exports.sendMessage = async(sock, id, text) => {
    await sock.sendMessage(
        id,
        {
            text 
        } 
    );
}

exports.sendMedia = async(sock, id, ...opt) => {
    await sock.sendMessage(
        id, 
        ...opt
    )
}

exports.replyMessage = async(sock, id, text, quoted) => {
    await sock.sendMessage(
        id,
        {
            text
        },
        {
            quoted
        }
    );
}

exports.sendImage = async(sock, id, url, caption, ...opt) => {
    await sock.sendMessage(
        id,
        {
            image:
        {
            url
        },
            caption
        },
    );
}

exports.sendAuthorContact = async(sock, id) => {
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
    await sock.sendMessage(
        id,
        { 
            contacts: contact
        }
    )
}