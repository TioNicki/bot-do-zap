# Bot Finanças - Abrobra

Bot de WhatsApp que roda com `whatsapp-web.js`, envia lembretes e responde comandos básicos.

## Como usar

### Requisitos

- Node.js 18+ instalado
- PostgreSQL disponível (ou serviço compatível)
- Chromium disponível no ambiente

### Instalação

```bash
cd "d:\Treinando e criando\Bot Finanças"
npm install
```

### Variáveis de ambiente

O bot suporta as seguintes variáveis:

- `PORT` - porta do servidor HTTP (padrão `3000`)
- `DATABASE_URL` - string de conexão PostgreSQL
- `DB_USER` - usuário PostgreSQL (se não usar `DATABASE_URL`)
- `DB_PASSWORD` - senha PostgreSQL
- `DB_HOST` - host do banco de dados
- `DB_PORT` - porta PostgreSQL (padrão `5432`)
- `DB_NAME` - nome do banco de dados
- `CHROMIUM_PATH` - caminho para o executável Chromium ou Chrome no ambiente (padrão tenta `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/usr/bin/google-chrome-stable` e outros)

### Rodando localmente

```bash
npm start
```

Acesse `http://localhost:3000` para verificar se o servidor está ativo.

## Deploy no Railway

1. Crie um novo projeto no Railway.
2. Conecte o repositório ao Railway.
3. Defina as variáveis de ambiente no Railway:
   - `PORT`
   - `DATABASE_URL` ou `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
   - `CHROMIUM_PATH` (padrão tenta vários caminhos comuns, mas defina explicitamente se o container não encontrar o Chrome/Chromium)
4. Configure a build:
   - Comando de build: `npm install`
   - Comando de start: `npm start`
5. Adicione persistência para a pasta `.wwebjs_auth` se quiser manter a sessão do WhatsApp após reinícios.

> Importante: o WhatsApp Web salva sessão localmente em `.wwebjs_auth/`. Sem persistência de disco, você pode precisar reautenticar após cada deploy ou restart.

## Comandos do bot

- `!fig` - cria figurinha a partir de mídia enviada
- `!dado` - rola um dado de 6 faces
- `!sortear item1, item2, item3` - sorteia um item
- `!lembrete [minutos] [mensagem]` - agenda um lembrete
- `!meme` - envia um meme aleatório
- `!info` - mostra a ajuda

## Observações

- O bot inicia o `ReminderWatcher` somente após o WhatsApp estar pronto.
- O servidor HTTP serve apenas para manter o app acordado e permitir healthchecks.
- Remova dependências não usadas no `package.json` se quiser simplificar o projeto.
