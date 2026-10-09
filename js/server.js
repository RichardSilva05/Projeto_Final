// ============================================================
// SERVIDOR - SABINO GESSO
// Uso: npm install express cors mysql2 express-rate-limit dotenv
//      node server.js
//
// Variáveis de ambiente (arquivo .env ao lado do server.js):
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD (obrigatória), DB_NAME
//   CORS_ORIGIN  -> origens permitidas, separadas por vírgula
//                   ex.: https://sabinogesso.com.br,https://www.sabinogesso.com.br
//   API_TOKEN    -> token exigido na listagem (GET /api/orcamentos)
//   NODE_ENV     -> "production" em produção
//   PORT
// ============================================================

try {
    require("dotenv").config();
} catch (erro) {
    // dotenv é opcional: sem ele, use variáveis de ambiente do sistema.
}

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const EM_PRODUCAO = process.env.NODE_ENV === "production";

// ============================================================
// CONFIGURAÇÃO OBRIGATÓRIA
// Sem senha definida o servidor não sobe (nada de root/root).
// ============================================================

if (!process.env.DB_PASSWORD) {
    console.error(
        "ERRO: defina a variável de ambiente DB_PASSWORD antes de iniciar."
    );
    process.exit(1);
}

const app = express();

// ============================================================
// CORS RESTRITO
// ============================================================

const origensPermitidas = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

if (origensPermitidas.length === 0) {
    if (EM_PRODUCAO) {
        console.error(
            "ERRO: defina CORS_ORIGIN (domínios permitidos) em produção."
        );
        process.exit(1);
    }

    console.warn(
        "AVISO: CORS_ORIGIN não definido. Liberando todas as origens " +
        "apenas porque NODE_ENV não é 'production'."
    );
}

app.use(cors({
    origin: function (origin, callback) {
        // Requisições sem Origin (mesmo domínio, curl, etc.)
        if (!origin) return callback(null, true);

        if (origensPermitidas.length === 0) {
            return callback(null, true); // somente em desenvolvimento
        }

        return callback(null, origensPermitidas.includes(origin));
    }
}));

app.use(express.json({ limit: "20kb" }));

// ============================================================
// LIMITE DE REQUISIÇÕES
// ============================================================

const limitePost = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        erro: "Muitas solicitações. Tente novamente em alguns minutos."
    }
});

const limiteGet = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Muitas requisições. Tente novamente mais tarde." }
});

// ============================================================
// AUTENTICAÇÃO SIMPLES POR TOKEN (rotas internas)
// Envie o cabeçalho:  Authorization: Bearer SEU_TOKEN
// ============================================================

function exigirToken(req, res, next) {
    const tokenEsperado = process.env.API_TOKEN;

    if (!tokenEsperado) {
        return res.status(503).json({
            erro: "Listagem indisponível: API_TOKEN não configurado."
        });
    }

    const cabecalho = req.headers.authorization || "";
    const enviado = cabecalho.startsWith("Bearer ")
        ? cabecalho.slice(7)
        : "";

    const a = Buffer.from(enviado);
    const b = Buffer.from(tokenEsperado);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ erro: "Não autorizado." });
    }

    next();
}

// ============================================================
// CONEXÃO COM O BANCO
// ============================================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "sabino_gesso",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10
});

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

const PRAZOS = ["Urgente", "Até 30 dias", "Sem pressa"];

function soDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

function pad(numero, tamanho) {
    return String(numero).padStart(tamanho, "0");
}

function codigoTemporario() {
    return "TMP" + crypto.randomBytes(8).toString("hex");
}

function validarCPF(cpf) {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    for (let t = 9; t < 11; t++) {
        let soma = 0;

        for (let i = 0; i < t; i++) {
            soma += Number(cpf[i]) * (t + 1 - i);
        }

        const digito = ((soma * 10) % 11) % 10;

        if (digito !== Number(cpf[t])) {
            return false;
        }
    }

    return true;
}

// DDD entre 11 e 99; celular (11 dígitos) começa com 9
function validarTelefone(numeros) {
    if (numeros.length !== 10 && numeros.length !== 11) {
        return false;
    }

    if (!/^[1-9][1-9]/.test(numeros)) {
        return false;
    }

    if (numeros.length === 11) {
        return numeros[2] === "9";
    }

    return /^[2-9]/.test(numeros[2]);
}

function validarEntrada(d) {
    const texto = v => String(v ?? "").trim();

    const cpf = soDigitos(d.cpf);
    const cep = soDigitos(d.cep);
    const telefone = soDigitos(d.telefone);

    if (!texto(d.nome) || texto(d.nome).length > 150) {
        return "Nome inválido.";
    }

    if (!validarCPF(cpf)) {
        return "CPF inválido.";
    }

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(d.email)) ||
        texto(d.email).length > 150
    ) {
        return "E-mail inválido.";
    }

    if (!validarTelefone(telefone)) {
        return "Telefone inválido.";
    }

    if (!(Number(d.area) > 0) || Number(d.area) >= 100000000) {
        return "Área inválida.";
    }

    if (!PRAZOS.includes(d.prazo)) {
        return "Prazo inválido.";
    }

    if (cep.length !== 8) {
        return "CEP inválido.";
    }

    if (!/^[A-Za-z]{2}$/.test(texto(d.estado))) {
        return "Estado inválido.";
    }

    if (!texto(d.cidade) || texto(d.cidade).length > 100) {
        return "Cidade inválida.";
    }

    if (!texto(d.bairro) || texto(d.bairro).length > 100) {
        return "Bairro inválido.";
    }

    if (!texto(d.logradouro) || texto(d.logradouro).length > 150) {
        return "Logradouro inválido.";
    }

    if (!texto(d.numero) || texto(d.numero).length > 20) {
        return "Número inválido.";
    }

    if (!Array.isArray(d.servicos) || d.servicos.length === 0) {
        return "Selecione pelo menos um serviço.";
    }

    if (d.servicos.includes("Outro")) {
        const outro = texto(d.outroDescricao);

        if (!outro || outro.length > 150) {
            return "Descreva o outro serviço (até 150 caracteres).";
        }
    }

    return null;
}

// ============================================================
// POST /api/orcamentos
// - Cliente novo: cria o cadastro e o endereço cadastral.
// - Cliente existente (mesmo CPF): NÃO altera nenhum dado dele;
//   apenas vincula o novo orçamento ao cadastro.
// - O endereço do serviço fica sempre em enderecos_orcamento.
// ============================================================

app.post("/api/orcamentos", limitePost, async function (req, res) {
    const d = req.body || {};

    const erro = validarEntrada(d);

    if (erro) {
        return res.status(400).json({ erro });
    }

    const nome = String(d.nome).trim();
    const documento = soDigitos(d.cpf);
    const email = String(d.email).trim();
    const telefone = String(d.telefone).trim();

    const cepLimpo = soDigitos(d.cep);
    const cep = `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;

    const estado = String(d.estado).trim().toUpperCase();
    const cidade = String(d.cidade).trim();
    const bairro = String(d.bairro).trim();
    const logradouro = String(d.logradouro).trim();
    const numero = String(d.numero).trim();

    const observacoes = String(d.complemento ?? "").trim();
    const complemento = observacoes.slice(0, 150) || null;

    const servicosPedidos = [...new Set(d.servicos.map(String))];

    let conexao;
    let transacaoIniciada = false;

    try {
        conexao = await pool.getConnection();

        await conexao.beginTransaction();
        transacaoIniciada = true;

        // ----------------------------------------------------
        // VALIDAR SERVIÇOS
        // ----------------------------------------------------

        const [servicosBanco] = await conexao.query(
            "SELECT id, nome FROM servicos WHERE ativo = TRUE"
        );

        const mapaServicos = {};

        servicosBanco.forEach(s => {
            mapaServicos[s.nome] = s.id;
        });

        const invalido = servicosPedidos.find(
            s => !Object.prototype.hasOwnProperty.call(mapaServicos, s)
        );

        if (invalido) {
            await conexao.rollback();
            transacaoIniciada = false;

            return res.status(400).json({
                erro: `Serviço inválido: ${invalido}`
            });
        }

        // ----------------------------------------------------
        // CLIENTE
        // ----------------------------------------------------

        let clienteId;
        let clienteCodigo;

        const [existente] = await conexao.query(
            `SELECT id, codigo
             FROM clientes
             WHERE documento = ?
             LIMIT 1
             FOR UPDATE`,
            [documento]
        );

        if (existente.length > 0) {
            // Cliente já cadastrado: nada é sobrescrito.
            clienteId = existente[0].id;
            clienteCodigo = existente[0].codigo;

        } else {
            const [novo] = await conexao.query(
                `INSERT INTO clientes
                    (codigo, tipo_cliente, nome, documento, email, telefone)
                 VALUES (?, 'PF', ?, ?, ?, ?)`,
                [
                    codigoTemporario(),
                    nome,
                    documento,
                    email,
                    telefone
                ]
            );

            clienteId = novo.insertId;
            clienteCodigo = `CLI-${pad(clienteId, 4)}`;

            await conexao.query(
                "UPDATE clientes SET codigo = ? WHERE id = ?",
                [clienteCodigo, clienteId]
            );

            // Endereço cadastral: criado só uma vez, com o cliente.
            await conexao.query(
                `INSERT INTO enderecos
                    (cliente_id, cep, estado, cidade, bairro,
                     logradouro, numero, complemento)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    clienteId,
                    cep,
                    estado,
                    cidade,
                    bairro,
                    logradouro,
                    numero,
                    complemento
                ]
            );
        }

        // ----------------------------------------------------
        // ORÇAMENTO
        // ----------------------------------------------------

        const [orcamento] = await conexao.query(
            `INSERT INTO orcamentos
                (codigo, cliente_id, area, prazo, observacoes)
             VALUES (?, ?, ?, ?, ?)`,
            [
                codigoTemporario(),
                clienteId,
                Number(d.area),
                d.prazo,
                observacoes || null
            ]
        );

        const orcamentoId = orcamento.insertId;

        const codigo =
            `ORC-${new Date().getFullYear()}-${pad(orcamentoId, 4)}`;

        await conexao.query(
            "UPDATE orcamentos SET codigo = ? WHERE id = ?",
            [codigo, orcamentoId]
        );

        // ----------------------------------------------------
        // ENDEREÇO DO SERVIÇO (histórico de cada orçamento)
        // ----------------------------------------------------

        await conexao.query(
            `INSERT INTO enderecos_orcamento
                (orcamento_id, cep, estado, cidade, bairro,
                 logradouro, numero, complemento)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orcamentoId,
                cep,
                estado,
                cidade,
                bairro,
                logradouro,
                numero,
                complemento
            ]
        );

        // ----------------------------------------------------
        // SERVIÇOS DO ORÇAMENTO
        // ----------------------------------------------------

        for (const nomeServico of servicosPedidos) {
            await conexao.query(
                `INSERT INTO orcamento_servicos
                    (orcamento_id, servico_id, outro_descricao)
                 VALUES (?, ?, ?)`,
                [
                    orcamentoId,
                    mapaServicos[nomeServico],
                    nomeServico === "Outro"
                        ? String(d.outroDescricao).trim()
                        : null
                ]
            );
        }

        await conexao.commit();
        transacaoIniciada = false;

        return res.status(201).json({
            mensagem: "Orçamento criado com sucesso.",
            codigo,
            clienteCodigo
        });

    } catch (erro) {
        if (conexao && transacaoIniciada) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                console.error("Erro ao desfazer transação:", erroRollback);
            }
        }

        // Detalhes técnicos ficam só no log do servidor.
        console.error("Erro ao salvar orçamento:", erro);

        return res.status(500).json({
            erro: "Erro ao salvar o orçamento. Tente novamente."
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

// ============================================================
// GET /api/orcamentos   (PROTEGIDA POR TOKEN)
// Lista os orçamentos para o projetos.js.
// ============================================================

app.get(
    "/api/orcamentos",
    limiteGet,
    exigirToken,
    async function (req, res) {
        try {
            const [orcamentos] = await pool.query(`
                SELECT
                    o.id,
                    o.codigo,
                    o.area,
                    o.prazo,
                    o.valor,
                    o.status,
                    o.progresso,
                    o.observacoes,
                    o.criado_em AS criadoEm,
                    c.codigo AS clienteCodigo,
                    c.nome AS clienteNome,
                    e.cep,
                    e.estado,
                    e.cidade,
                    e.bairro,
                    e.logradouro,
                    e.numero,
                    e.complemento
                FROM orcamentos o
                JOIN clientes c ON c.id = o.cliente_id
                LEFT JOIN enderecos_orcamento e ON e.orcamento_id = o.id
                ORDER BY o.criado_em DESC
            `);

            const [servicos] = await pool.query(`
                SELECT
                    os.orcamento_id,
                    s.nome,
                    os.outro_descricao
                FROM orcamento_servicos os
                JOIN servicos s ON s.id = os.servico_id
            `);

            const servicosPorOrcamento = {};

            servicos.forEach(function (item) {
                if (!servicosPorOrcamento[item.orcamento_id]) {
                    servicosPorOrcamento[item.orcamento_id] = [];
                }

                servicosPorOrcamento[item.orcamento_id].push(
                    item.nome === "Outro" && item.outro_descricao
                        ? item.outro_descricao
                        : item.nome
                );
            });

            const resultado = orcamentos.map(function (o) {
                return {
                    ...o,
                    area: Number(o.area),
                    valor: Number(o.valor),
                    progresso: Number(o.progresso),
                    servicos: servicosPorOrcamento[o.id] || []
                };
            });

            return res.json(resultado);

        } catch (erro) {
            console.error("Erro ao listar orçamentos:", erro);

            return res.status(500).json({
                erro: "Erro ao buscar os orçamentos."
            });
        }
    }
);

// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, async function () {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);

    try {
        await pool.query("SELECT 1");
        console.log("Conectado ao MySQL com sucesso.");
    } catch (erro) {
        console.error(
            "NÃO foi possível conectar ao MySQL:",
            erro.code,
            "-",
            erro.message
        );
    }
});