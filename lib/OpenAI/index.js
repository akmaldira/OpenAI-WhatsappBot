const { Configuration, OpenAIApi } = require("openai");
const dotenv = require('dotenv');
dotenv.config();
const configuration = new Configuration({
  organization: "org-PatxbYnAfUQp7PD8pXuADr3Z",
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
    const cleanText = response.data.choices[0].text;
    return '*ChatBot OpenAI*\n' + cleanText;
}

const generateImage = async (text) => {
  const response = await openai.createImage({
    prompt: text,
    n: 1,
    size: "512x512",
  });
  return response.data.data[0].url;
}

exports.freeText = freeText;
exports.generateImage = generateImage;
