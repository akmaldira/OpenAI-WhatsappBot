const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const freeText = async (text) => {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0.77,
        max_tokens: 1000,
        frequency_penalty: 0,
        presence_penalty: 0,
    });
    return response.data.choices[0].text;
}

exports.freeText = freeText;
