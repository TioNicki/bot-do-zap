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
const app = express();
app.get('/', (req, res) => res.send('Abrobra Online!'));
app.listen(process.env.PORT || 3000);

const pool = new Pool({
    user: 'postgres.kewtadtuizlncqpphzcf',
    password: 'P*KD,QaC_bE8@SH',
    host: 'aws-1-us-west-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/chromium', // O Nixpacks coloca ele aqui
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('🤖 Abrobra está operante!'));

// ==========================================
// 2. VIGIA DE LEMBRETES
// ==========================================
setInterval(async () => {
    try {
        const res = await pool.query('SELECT * FROM lembretes WHERE enviado = FALSE AND data_envio <= NOW()');
        for (const row of res.rows) {
            client.sendMessage(row.chat_id, `🔔 LEMBRETE: ${row.mensagem}`);
            await pool.query('UPDATE lembretes SET enviado = TRUE WHERE id = $1', [row.id]);
        }
    } catch (e) { console.error('Erro no vigia:', e); }
}, 30000);

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
        const min = parseInt(args[1]);
        const recado = args.slice(2).join(' ');
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
