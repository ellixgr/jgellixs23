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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


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
const SENHA_MESTRE = process.env.SENHA_MESTRE;

// --- SISTEMA DE MOEDAS (MANTIDO) ---
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

// --- CLIQUES (MANTIDO) ---
app.post('/contar-clique', async (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).send();
    try {
        await db.ref(`grupos/${key}/cliques`).transaction(c => (c || 0) + 1);
        res.json({ success: true });
    } catch (e) { res.status(500).send(); }
});

// --- NOVO: EDITAR GRUPO ---
app.post('/editar-grupo', async (req, res) => {
    const { key, donoLocal, nome, link, descricao, categoria, foto } = req.body;
    try {
        const refGrupo = db.ref(`grupos/${key}`);
        const snapshot = await refGrupo.once('value');
        const dados = snapshot.val();
        if (dados && dados.dono === donoLocal) {
            await refGrupo.update({ nome, link, descricao, categoria, foto });
            return res.json({ success: true });
        }
        res.json({ success: false, message: "Acesso Negado" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- NOVO: EXCLUIR GRUPO ---
app.post('/excluir-grupo', async (req, res) => {
    const { key, donoLocal } = req.body;
    try {
        const refGrupo = db.ref(`grupos/${key}`);
        const snapshot = await refGrupo.once('value');
        const dados = snapshot.val();
        if (dados && dados.dono === donoLocal) {
            await refGrupo.remove();
            return res.json({ success: true });
        }
        res.json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- NOVO: IMPULSIONAR GRUPO ---
app.post('/impulsionar-grupo', async (req, res) => {
    const { key, donoLocal } = req.body;
    try {
        const refGrupo = db.ref(`grupos/${key}`);
        const snapshot = await refGrupo.once('value');
        if (snapshot.val().dono === donoLocal) {
            await refGrupo.update({ ultimoImpulso: Date.now() });
            return res.json({ success: true });
        }
        res.json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- LOGIN E VIP (MANTIDO) ---
app.post('/login-abareta', (req, res) => {
    const { senha } = req.body;
    if (!SENHA_MESTRE || senha !== SENHA_MESTRE) return res.json({ autorizado: false });
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
        // Alterado para salvar direto em 'grupos' para o seu sistema de 'Meus Grupos' ler
        await db.ref('grupos').push().set({
            nome, link, categoria, descricao, foto, dono,
            vip: e_vip, vipAte: validade, status: "aprovado", criadoEm: Date.now(), cliques: 0
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro" }); }
});

// --- FAXINA VIP (MANTIDO) ---
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

// --- PROTEÇÃO CONTRA CRASHES (MANTIDO) ---
process.on('uncaughtException', (err) => console.error('⚠️ Erro:', err.message));
process.on('unhandledRejection', (reason) => console.error('⚠️ Rejeição:', reason));

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Blindado na porta ${PORT}`); 
});

// --- CONEXÃO FLUIDA (TIMEOUTS MANTIDOS) ---
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
