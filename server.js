const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const crypto = require('crypto');
const helmet = require('helmet');

const app = express();

// 1. SEGURANÇA E ESTABILIDADE
app.use(helmet()); 
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// CONFIGURAÇÃO DO FIREBASE
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://cliques-4a2c1-default-rtdb.firebaseio.com"
        });
        console.log("✅ Servidor Autenticado");
    } catch (e) {
        console.error("❌ Erro na Service Account");
        process.exit(1);
    }
}

const db = admin.database();

// 🛡️ SENHA TOTALMENTE ESCONDIDA
// Agora ela SÓ existe no painel do Render. Se não configurares lá, ninguém entra.
const SENHA_MESTRE = process.env.SENHA_MESTRE;

// --- SISTEMA DE MOEDAS ---
app.post('/ganhar-moeda', async (req, res) => {
    const { usuarioID } = req.body;
    if (!usuarioID) return res.json({ success: false });
    try {
        const moedasRef = db.ref(`usuarios/${usuarioID}/moedas`);
        const resultado = await moedasRef.transaction((valorAtual) => {
            let total = valorAtual || 0;
            if (total >= 20) return; 
            return total + 1;
        });
        if (!resultado.committed) return res.json({ success: false });
        return res.json({ success: true, novasMoedas: resultado.snapshot.val() });
    } catch (error) {
        return res.json({ success: false });
    }
});

// --- CLIQUES ---
app.post('/contar-clique', async (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).send();
    try {
        await db.ref(`grupos/${key}/cliques`).transaction(c => (c || 0) + 1);
        res.json({ success: true });
    } catch (e) { res.status(500).send(); }
});

// --- LOGIN E VIP ---
app.post('/login-abareta', (req, res) => {
    const { senha } = req.body;
    // Se a senha do Render não estiver configurada ou estiver errada, nega.
    if (!SENHA_MESTRE || senha !== SENHA_MESTRE) {
        return res.json({ autorizado: false });
    }
    res.json({ autorizado: true });
});

app.post('/gerar-vip', async (req, res) => {
    const { senha, duracaoHoras } = req.body;
    if (!SENHA_MESTRE || senha !== SENHA_MESTRE) return res.status(403).json({ error: "🔒" });
    
    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();
    try {
        await db.ref(`codigos_vips/${codigo}`).set({
            status: "disponivel",
            validadeHoras: parseInt(duracaoHoras) || 24,
            criadoEm: new Date().toISOString()
        });
        res.json({ codigo });
    } catch (e) { res.status(500).json({ error: "Erro" }); }
});

app.post('/salvar-grupo', async (req, res) => {
    const { nome, link, categoria, descricao, foto, dono, codigoVip } = req.body;
    try {
        let e_vip = false;
        let validade = null;
        if (codigoVip) {
            const vipSnap = await db.ref(`codigos_vips/${codigoVip}`).once('value');
            if (vipSnap.exists() && vipSnap.val().status === "disponivel") {
                e_vip = true;
                validade = Date.now() + (vipSnap.val().validadeHoras * 3600000);
                await db.ref(`codigos_vips/${codigoVip}`).update({ status: "usado" });
            }
        }
        await db.ref('solicitacoes').push().set({
            nome, link, categoria, descricao, foto, dono, codigoVip,
            vip: e_vip, vipAte: validade, status: "pendente", criadoEm: Date.now()
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro" }); }
});

// --- FAXINA VIP ---
const limparVips = async () => {
    const agora = Date.now();
    try {
        const snap = await db.ref('grupos').orderByChild('vip').equalTo(true).once('value');
        if (!snap.exists()) return;
        snap.forEach((child) => {
            const g = child.val();
            if (g.vipAte && agora > g.vipAte) {
                db.ref(`grupos/${child.key}`).update({ vip: false, vipAte: null });
            }
        });
    } catch (e) { }
};
setInterval(limparVips, 30 * 60 * 1000);

// --- PROTEÇÃO CONTRA CRASHES ---
process.on('uncaughtException', (err) => console.error('⚠️ Erro:', err.message));
process.on('unhandledRejection', (reason) => console.error('⚠️ Rejeição:', reason));

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Blindado na porta ${PORT}`); 
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
