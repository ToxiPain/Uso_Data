// rpg.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
import pino from 'pino';
import { loadDatabase, saveDatabase } from './database.js';
import handler from './commands.js';

const { state, saveState } = useSingleFileAuthState('./auth_info_multi.json');

const startSock = () => {
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message.message) return;
        if (message.key && message.key.remoteJid === 'status@broadcast') return;
        const { text } = message.message.conversation ? message.message : message.message.extendedTextMessage || '';
        const usedPrefix = text.startsWith('/') ? '/' : text.startsWith('!') ? '!' : text.startsWith('.') ? '.' : '';
        const command = text.trim().split(' ')[0].slice(usedPrefix.length).toLowerCase();
        const m = {
            sender: message.key.remoteJid,
            chat: message.key.remoteJid,
            text,
            command,
            reply: (msg) => sock.sendMessage(message.key.remoteJid, { text: msg }),
        };

        await handler(m, { conn: sock, command, usedPrefix });
    });
};

startSock();
