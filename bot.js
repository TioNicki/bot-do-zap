const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Pool } = require('pg');
const express = require('express');

// ==========================================
// 0. FUNÇÃO AUXILIAR DE DELAY
// ==========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. CONFIGURAÇÕES E SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
const CHROME_PATH = findChromiumPath();
const DATABASE_URL = process.env.DATABASE_URL;

function findChromiumPath() {
    const candidates = [
        process.env.CHROMIUM_PATH,
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/snap/bin/chromium'
    ].filter(Boolean);

    const found = candidates.find((path) => fs.existsSync(path));
    if (found) {
        console.log('Usando Chromium em:', found);
        return found;
    }

    console.error('Nenhum executável Chromium encontrado nos caminhos esperados:', candidates.join(', '));
    console.error('Defina CHROMIUM_PATH para o caminho correto do navegador no ambiente Railway.');
    return '/usr/bin/chromium';
}

const app = express();
app.get('/', (req, res) => res.send('Abrobra Online!'));
app.listen(PORT, () => console.log(`Servidor HTTP ativo na porta ${PORT}`));

const poolConfig = DATABASE_URL
    ? { connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    };

const pool = new Pool(poolConfig);
pool.on('error', err => console.error('Erro no pool PostgreSQL:', err));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: CHROME_PATH,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
    console.log('🤖 Abrobra está operante!');
    startReminderWatcher();
});

let reminderInterval;
async function startReminderWatcher() {
    if (reminderInterval) return;
    await checkReminders();
    reminderInterval = setInterval(checkReminders, 30000);
}

async function checkReminders() {
    try {
        const res = await pool.query('SELECT * FROM lembretes WHERE enviado = FALSE AND data_envio <= NOW()');
        for (const row of res.rows) {
            await client.sendMessage(row.chat_id, `🔔 LEMBRETE: ${row.mensagem}`);
            await pool.query('UPDATE lembretes SET enviado = TRUE WHERE id = $1', [row.id]);
        }
    } catch (e) {
        console.error('Erro no vigia:', e);
    }
}

// ==========================================
// 3. COMANDOS DO BOT
// ==========================================
client.on('message', async msg => {
    // Verifica se é um comando nosso
    if (!msg.body.startsWith('!')) return;

    // --- DELAY DE 2 SEGUNDOS ---
    const chat = await msg.getChat();
    await chat.sendStateTyping(); // Mostra "digitando..."
    await sleep(2000); 

    const texto = msg.body.toLowerCase();
    const args = texto.split(' ');
    const comando = args[0];

    // --- FIGURINHA ---
    if (comando === '!fig' && msg.hasMedia) {
        const media = await msg.downloadMedia();
        await client.sendMessage(msg.from, media, { sendMediaAsSticker: true });
    }

    // --- DADO ---
    else if (comando === '!dado') {
        msg.reply(`🎲 Dado: ${Math.floor(Math.random() * 6) + 1}`);
    }

    // --- SORTEAR ---
    else if (comando === '!sortear') {
        const itens = msg.body.replace('!sortear', '').split(',');
        const sorteado = itens[Math.floor(Math.random() * itens.length)];
        msg.reply(`🏆 Sorteado: *${sorteado.trim()}*`);
    }

    // --- LEMBRETE ---
    else if (comando === '!lembrete') {
        const min = parseInt(args[1], 10);
        const recado = args.slice(2).join(' ');

        if (Number.isNaN(min) || min <= 0 || !recado) {
            msg.reply('Uso: !lembrete [minutos] [mensagem]');
            return;
        }

        const dataAlvo = new Date(Date.now() + min * 60000);
        await pool.query('INSERT INTO lembretes (mensagem, data_envio, chat_id) VALUES ($1, $2, $3)', [recado, dataAlvo, msg.from]);
        msg.reply(`✅ Lembrete agendado para daqui a ${min} minutos.`);
    }

    // --- MEME ---
    else if (comando === '!meme') {
        const memes = ['https://i.imgflip.com/1g8my4.jpg', 'https://i.imgflip.com/1bij.jpg'];
        const media = await MessageMedia.fromUrl(memes[Math.floor(Math.random() * memes.length)]);
        client.sendMessage(msg.from, media, { caption: 'Meme do dia!' });
    }
    // --- ℹ️ INFO / AJUDA ---
    else if (comando === '!info') {
        const infoMsg = `
🤖 *Olá! Eu sou o Abrobra, seu assistente de grupo.*
Aqui estão meus comandos:

🖼️ *!fig* - Envie uma foto com este comando para criar uma figurinha.
🎲 *!dado* - Rola um dado de 6 faces.
🏆 *!sortear item1, item2, item3* - Sorteia um item da lista.
⏰ *!lembrete [minutos] [mensagem]* - Agenda um lembrete.
😂 *!meme* - Envia um meme aleatório.

*Qualquer dúvida, é só chamar!*
        `;
        msg.reply(infoMsg);
    }
});

client.initialize();