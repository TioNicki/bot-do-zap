const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = 'AIzaSyA59dPwEfivMyHQGPqwZ5Czp1veCYX_Zcs';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { candidateCount: 1, maxOutputTokens: 1000 } });
const prompt = "Você é o Abrobra. Responda apenas com JSON: {\"intent\":\"chat\",\"creditor\":\"\",\"debtor\":\"\",\"amount\":0,\"description\":\"\",\"reply\":\"Olá\"}";
model.generateContent(prompt).then(result => {
  return result.response.text();
}).then(text => {
  console.log('---START---');
  console.log(text);
  console.log('---END---');
}).catch(error => {
  console.error(error);
  process.exit(1);
});
