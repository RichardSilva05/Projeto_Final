// ============================================================
// SERVIDOR - SABINO GESSO
// Uso: npm install express cors mysql2 express-rate-limit dotenv
//                  jsonwebtoken bcryptjs
//      node server.js
//
// Variáveis de ambiente (arquivo .env ao lado do server.js):
//   DB_HOST, DB_PORT (padrão 3307), DB_USER, DB_PASSWORD (obrigatória),
//   DB_NAME
//   JWT_SECRET   -> OBRIGATÓRIA, mínimo 32 caracteres (assina o login)
//   CORS_ORIGIN  -> origens permitidas, separadas por vírgula
//                   ex.: https://sabinogesso.com.br,https://www.sabinogesso.com.br
//   TRUST_PROXY  -> nº de proxies à frente do servidor (ex.: 1 com Nginx,
//                   Cloudflare, Render). Padrão: 0 (sem proxy)
//   NODE_ENV     -> "production" em produção
//   PORT
//
// Administradores ficam na tabela "administradores" (banco_admin.sql).
// Crie o primeiro com:  node criar_admin.js
//
// Requer express-rate-limit v7 ou superior (usa a opção "limit").
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
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const EM_PRODUCAO = process.env.NODE_ENV === "production";

if (!process.env.DB_PASSWORD) {
    console.error(
        "ERRO: defina a variável de ambiente DB_PASSWORD antes de iniciar."
    );
    process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error(
        "ERRO: defina JWT_SECRET no .env (mínimo 32 caracteres)."
    );
    process.exit(1);
}

const app = express();

// Atrás de proxy reverso, sem isso todos os usuários teriam o mesmo IP
// e o rate limit valeria para o site inteiro.
const trustProxy = Number(process.env.TRUST_PROXY) || 0;

if (trustProxy > 0) {
    app.set("trust proxy", trustProxy);
}

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

        if (origensPermitidas.includes(origin)) {
            return callback(null, true);
        }

        const erro = new Error("Origem não permitida.");
        erro.status = 403;
        return callback(erro);
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

// Limite por IP no login (além do bloqueio por conta, mais abaixo)
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        erro: "Muitas tentativas. Tente novamente em alguns minutos."
    }
});

// Limite para ações do painel (alterar projetos etc.)
const limiteAdmin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Muitas requisições. Tente novamente mais tarde." }
});

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
// LOGIN DE ADMINISTRADOR (tabela "administradores")
// ============================================================

const MAX_TENTATIVAS = 5;
const MINUTOS_BLOQUEIO = 15;

// Hash falso: se o e-mail não existir, ainda assim gastamos o mesmo
// tempo comparando, para não revelar quais e-mails são cadastrados.
const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-tempo", 12);

// POST /api/admin/login  { email, senha }  ->  { token, nome }
app.post("/api/admin/login", limiteLogin, async function (req, res) {
    const email = String((req.body || {}).email ?? "")
        .trim()
        .toLowerCase();
    const senha = String((req.body || {}).senha ?? "");

    const ERRO_GENERICO = { erro: "E-mail ou senha inválidos." };

    if (!email || !senha || email.length > 150 || senha.length > 200) {
        return res.status(401).json(ERRO_GENERICO);
    }

    try {
        const [linhas] = await pool.query(
            `SELECT id, nome, senha_hash, ativo, tentativas_falhas,
                    bloqueado_ate > NOW() AS bloqueado
             FROM administradores
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        const admin = linhas[0];

        // Conta bloqueada por tentativas erradas
        if (admin && admin.bloqueado) {
            return res.status(429).json({
                erro: `Conta bloqueada por ${MINUTOS_BLOQUEIO} minutos ` +
                      "após muitas tentativas."
            });
        }

        const senhaOk = await bcrypt.compare(
            senha,
            admin ? admin.senha_hash : HASH_FALSO
        );

        // E-mail não cadastrado
        if (!admin) {
            return res.status(401).json({
                erro: "E-mail não cadastrado.",
                campo: "email"
            });
        }

        // Senha incorreta: conta a tentativa e bloqueia após o limite
        if (!senhaOk) {
            const falhas = admin.tentativas_falhas + 1;

            if (falhas >= MAX_TENTATIVAS) {
                await pool.query(
                    `UPDATE administradores
                     SET tentativas_falhas = 0,
                         bloqueado_ate =
                             DATE_ADD(NOW(), INTERVAL ? MINUTE)
                     WHERE id = ?`,
                    [MINUTOS_BLOQUEIO, admin.id]
                );

                return res.status(429).json({
                    erro: "Senha incorreta. Conta bloqueada por " +
                          `${MINUTOS_BLOQUEIO} minutos.`,
                    campo: "senha"
                });
            }

            await pool.query(
                `UPDATE administradores
                 SET tentativas_falhas = ?
                 WHERE id = ?`,
                [falhas, admin.id]
            );

            const restantes = MAX_TENTATIVAS - falhas;

            return res.status(401).json({
                erro: "Senha incorreta. " +
                      `Restam ${restantes} tentativa(s).`,
                campo: "senha"
            });
        }

        // Senha certa, mas a conta foi desativada
        if (!admin.ativo) {
            return res.status(403).json({
                erro: "Esta conta está desativada.",
                campo: "email"
            });
        }

        await pool.query(
            `UPDATE administradores
             SET tentativas_falhas = 0, bloqueado_ate = NULL,
                 ultimo_login = NOW()
             WHERE id = ?`,
            [admin.id]
        );

        const token = jwt.sign(
            { sub: admin.id, papel: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({ token, nome: admin.nome });

    } catch (erro) {
        console.error("Erro no login de admin:", erro);

        return res.status(500).json({
            erro: "Erro ao fazer login. Tente novamente."
        });
    }
});

// Middleware: exige o token do login e confere se a conta segue ativa.
// Envie o cabeçalho:  Authorization: Bearer SEU_TOKEN
async function exigirAdmin(req, res, next) {
    const cabecalho = req.headers.authorization || "";
    const token = cabecalho.startsWith("Bearer ")
        ? cabecalho.slice(7)
        : "";

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);

        if (dados.papel !== "admin" || !Number.isInteger(dados.sub)) {
            throw new Error("token inválido");
        }

        const [linhas] = await pool.query(
            "SELECT id FROM administradores WHERE id = ? AND ativo = TRUE",
            [dados.sub]
        );

        if (linhas.length === 0) {
            throw new Error("conta inativa");
        }

        req.adminId = dados.sub;
        next();

    } catch (erro) {
        return res.status(401).json({ erro: "Não autorizado." });
    }
}

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

    if (texto(d.complemento).length > 150) {
        return "Complemento muito longo (máximo 150 caracteres).";
    }

    if (texto(d.observacoes).length > 2000) {
        return "Observações muito longas (máximo 2000 caracteres).";
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

function validarCNPJServidor(valor) {
    const cnpj = soDigitos(valor);

    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }

    function calcularDigito(base) {
        const pesos = base.length === 12
            ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        const soma = [...base].reduce(
            (total, digito, i) =>
                total + Number(digito) * pesos[i],
            0
        );

        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    const primeiro = calcularDigito(cnpj.slice(0, 12));
    const segundo = calcularDigito(cnpj.slice(0, 12) + primeiro);

    return cnpj === cnpj.slice(0, 12) + primeiro + segundo;
}


// ============================================================
// POST /api/orcamentos/pj
// Cria um orçamento novo sem excluir os anteriores.
// ============================================================

app.post("/api/orcamentos/pj", limitePost, async function (req, res) {
    const d = req.body || {};
    const texto = valor => String(valor ?? "").trim();

    const razaoSocial = texto(d.razaoSocial);
    const nomeFantasia = texto(d.nomeFantasia);
    const responsavel = texto(d.responsavel);
    const cnpj = soDigitos(d.cnpj);
    const email = texto(d.email).toLowerCase();
    const telefone = soDigitos(d.telefone);
    const cepDigitos = soDigitos(d.cep);
    const uf = texto(d.estado).toUpperCase();
    const cidade = texto(d.cidade);
    const bairro = texto(d.bairro);
    const logradouro = texto(d.logradouro);
    const numero = texto(d.numero);
    const complemento = texto(d.complemento) || null;
    const observacoes = texto(d.observacoes) || null;
    const area = Number(d.area);
    const prazo = texto(d.prazo);

    if (!razaoSocial || razaoSocial.length > 150) {
        return res.status(400).json({ erro: "Razão social inválida." });
    }

    if (!nomeFantasia || nomeFantasia.length > 150) {
        return res.status(400).json({ erro: "Nome fantasia inválido." });
    }

    if (!responsavel || responsavel.length > 150) {
        return res.status(400).json({ erro: "Responsável inválido." });
    }

    if (!validarCNPJServidor(cnpj)) {
        return res.status(400).json({ erro: "CNPJ inválido." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
        return res.status(400).json({ erro: "E-mail inválido." });
    }

    if (!validarTelefone(telefone)) {
        return res.status(400).json({ erro: "Telefone inválido." });
    }

    if (!Number.isFinite(area) || area <= 0 || area >= 100000000) {
        return res.status(400).json({ erro: "Área inválida." });
    }

    if (!PRAZOS.includes(prazo)) {
        return res.status(400).json({ erro: "Prazo inválido." });
    }

    if (cepDigitos.length !== 8) {
        return res.status(400).json({ erro: "CEP inválido." });
    }

    if (!/^[A-Z]{2}$/.test(uf)) {
        return res.status(400).json({ erro: "Estado inválido." });
    }

    if (!cidade || cidade.length > 100) {
        return res.status(400).json({ erro: "Cidade inválida." });
    }

    if (!bairro || bairro.length > 100) {
        return res.status(400).json({ erro: "Bairro inválido." });
    }

    if (!logradouro || logradouro.length > 150) {
        return res.status(400).json({ erro: "Logradouro inválido." });
    }

    if (!numero || numero.length > 20) {
        return res.status(400).json({ erro: "Número inválido." });
    }

    if (complemento && complemento.length > 150) {
        return res.status(400).json({ erro: "Complemento muito longo." });
    }

    if (observacoes && observacoes.length > 2000) {
        return res.status(400).json({
            erro: "Observações muito longas (máximo 2000 caracteres)."
        });
    }

    const servicosRecebidos = Array.isArray(d.servicos)
        ? d.servicos.map(String)
        : [];

    const outroDescricao = texto(d.outroDescricao);

    if (outroDescricao.length > 150) {
        return res.status(400).json({
            erro: "A descrição do serviço deve ter até 150 caracteres."
        });
    }

    // "Outro" marcado sem descrição deve gerar erro (não ser ignorado)
    if (servicosRecebidos.includes("Outro") && !outroDescricao) {
        return res.status(400).json({
            erro: "Descreva o outro serviço."
        });
    }

    const servicosPedidos = [
        ...new Set([
            ...servicosRecebidos.filter(nome => nome !== "Outro"),
            ...(outroDescricao ? ["Outro"] : [])
        ])
    ];

    if (servicosPedidos.length === 0) {
        return res.status(400).json({
            erro: "Selecione pelo menos um serviço."
        });
    }

    let conexao;
    let transacaoIniciada = false;

    try {
        conexao = await pool.getConnection();
        await conexao.beginTransaction();
        transacaoIniciada = true;

        // Confere os serviços cadastrados no banco.
        const [servicosBanco] = await conexao.query(
            "SELECT id, nome FROM servicos WHERE ativo = TRUE"
        );

        const mapaServicos = {};

        servicosBanco.forEach(servico => {
            mapaServicos[servico.nome] = servico.id;
        });

        const servicoInvalido = servicosPedidos.find(
            nome => !Object.prototype.hasOwnProperty.call(mapaServicos, nome)
        );

        if (servicoInvalido) {
            throw new Error(
                `Serviço não cadastrado ou inativo: ${servicoInvalido}`
            );
        }

        // Reutiliza o cadastro da empresa, se o CNPJ já existir.
        // Não atualiza nem exclui o cadastro existente.
        const [clientesExistentes] = await conexao.query(
            `SELECT id, codigo, tipo_cliente
             FROM clientes
             WHERE documento = ?
             LIMIT 1
             FOR UPDATE`,
            [cnpj]
        );

        const cepFormatado =
            `${cepDigitos.slice(0, 5)}-${cepDigitos.slice(5)}`;

        let clienteId;
        let clienteCodigo;

        if (clientesExistentes.length > 0) {
            const cliente = clientesExistentes[0];

            if (cliente.tipo_cliente !== "PJ") {
                await conexao.rollback();
                transacaoIniciada = false;

                return res.status(409).json({
                    erro: "O documento já está cadastrado como Pessoa Física."
                });
            }

            clienteId = cliente.id;
            clienteCodigo = cliente.codigo;

        } else {
            // Cria a empresa somente quando o CNPJ ainda não existe.
            const [novoCliente] = await conexao.query(
                `INSERT INTO clientes
                    (codigo, tipo_cliente, nome, documento, email, telefone,
                     nome_fantasia, responsavel)
                 VALUES (?, 'PJ', ?, ?, ?, ?, ?, ?)`,
                [
                    codigoTemporario(),
                    razaoSocial,
                    cnpj,
                    email,
                    telefone,
                    nomeFantasia,
                    responsavel
                ]
            );

            clienteId = novoCliente.insertId;
            clienteCodigo = `CLI-${pad(clienteId, 4)}`;

            await conexao.query(
                "UPDATE clientes SET codigo = ? WHERE id = ?",
                [clienteCodigo, clienteId]
            );

            // Endereço cadastral inicial da empresa.
            await conexao.query(
                `INSERT INTO enderecos
                    (cliente_id, cep, estado, cidade, bairro,
                     logradouro, numero, complemento)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    clienteId,
                    cepFormatado,
                    uf,
                    cidade,
                    bairro,
                    logradouro,
                    numero,
                    complemento
                ]
            );
        }

        // Cada envio cria uma nova linha em orcamentos.
        // (colunas nome_fantasia_informado e responsavel_informado:
        //  veja migracao_pj.sql)
        const [novoOrcamento] = await conexao.query(
            `INSERT INTO orcamentos
                (codigo, cliente_id, nome_informado,
                 nome_fantasia_informado, responsavel_informado,
                 email_informado, telefone_informado,
                 area, prazo, observacoes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                codigoTemporario(),
                clienteId,
                razaoSocial,
                nomeFantasia,
                responsavel,
                email,
                telefone,
                area,
                prazo,
                observacoes
            ]
        );

        const orcamentoId = novoOrcamento.insertId;

        const codigo =
            `ORC-${new Date().getFullYear()}-${pad(orcamentoId, 4)}`;

        await conexao.query(
            "UPDATE orcamentos SET codigo = ? WHERE id = ?",
            [codigo, orcamentoId]
        );

        // Guarda um endereço próprio para este orçamento.
        await conexao.query(
            `INSERT INTO enderecos_orcamento
                (orcamento_id, cep, estado, cidade, bairro,
                 logradouro, numero, complemento)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orcamentoId,
                cepFormatado,
                uf,
                cidade,
                bairro,
                logradouro,
                numero,
                complemento
            ]
        );

        // Registra os serviços escolhidos para este orçamento.
        for (const nomeServico of servicosPedidos) {
            await conexao.query(
                `INSERT INTO orcamento_servicos
                    (orcamento_id, servico_id, outro_descricao)
                 VALUES (?, ?, ?)`,
                [
                    orcamentoId,
                    mapaServicos[nomeServico],
                    nomeServico === "Outro" ? outroDescricao : null
                ]
            );
        }

        await conexao.commit();
        transacaoIniciada = false;

        return res.status(201).json({
            mensagem: "Orçamento PJ criado com sucesso.",
            codigo,
            clienteCodigo
        });

    } catch (erro) {
        if (conexao && transacaoIniciada) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                console.error(
                    "Erro no rollback do orçamento PJ:", erroRollback
                );
            }
        }

        console.error("Erro ao salvar orçamento PJ:", erro);

        const servicoErro =
            erro.message?.startsWith("Serviço não cadastrado");

        return res.status(servicoErro ? 400 : 500).json({
            erro: servicoErro
                ? erro.message
                : "Erro ao salvar o orçamento PJ. Tente novamente."
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});


// ============================================================
// POST /api/orcamentos   (Pessoa Física)
// Nada é apagado nem sobrescrito:
// - Cliente novo: cria cadastro e endereço cadastral.
// - Cliente existente (mesmo CPF): dados do cadastro ficam
//   intactos; o novo orçamento é vinculado a ele e guarda os
//   dados de contato informados naquele envio.
// - Todo orçamento gera um registro novo, com endereço próprio.
// ============================================================

app.post("/api/orcamentos", limitePost, async function (req, res) {
    const d = req.body || {};

    const erro = validarEntrada(d);

    if (erro) {
        return res.status(400).json({ erro });
    }

    const nome = String(d.nome).trim();
    const documento = soDigitos(d.cpf);
    const email = String(d.email).trim().toLowerCase();
    const telefone = soDigitos(d.telefone);

    const cepLimpo = soDigitos(d.cep);
    const cep = `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;

    const estado = String(d.estado).trim().toUpperCase();
    const cidade = String(d.cidade).trim();
    const bairro = String(d.bairro).trim();
    const logradouro = String(d.logradouro).trim();
    const numero = String(d.numero).trim();

    const complemento = String(d.complemento ?? "").trim() || null;
    const observacoes = String(d.observacoes ?? "").trim() || null;

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

        const buscarCliente = () => conexao.query(
            `SELECT id, codigo
             FROM clientes
             WHERE documento = ?
             LIMIT 1
             FOR UPDATE`,
            [documento]
        );

        let clienteId;
        let clienteCodigo;
        let clienteNovo = false;

        let [existente] = await buscarCliente();

        if (existente.length === 0) {
            try {
                const [novo] = await conexao.query(
                    `INSERT INTO clientes
                        (codigo, tipo_cliente, nome, documento, email, telefone)
                     VALUES (?, 'PF', ?, ?, ?, ?)`,
                    [codigoTemporario(), nome, documento, email, telefone]
                );

                clienteId = novo.insertId;
                clienteNovo = true;

            } catch (erroInsert) {
                // Outro envio com o mesmo CPF foi gravado ao mesmo tempo:
                // reaproveita o cadastro dele em vez de dar erro.
                if (erroInsert.code !== "ER_DUP_ENTRY") {
                    throw erroInsert;
                }

                [existente] = await buscarCliente();

                if (existente.length === 0) {
                    throw erroInsert;
                }
            }
        }

        if (clienteNovo) {
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
                    clienteId, cep, estado, cidade, bairro,
                    logradouro, numero, complemento
                ]
            );

        } else {
            clienteId = existente[0].id;
            clienteCodigo = existente[0].codigo;
        }

        // ----------------------------------------------------
        // ORÇAMENTO (sempre um registro novo)
        // ----------------------------------------------------

        const [orcamento] = await conexao.query(
            `INSERT INTO orcamentos
                (codigo, cliente_id, nome_informado, email_informado,
                 telefone_informado, area, prazo, observacoes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                codigoTemporario(),
                clienteId,
                nome,
                email,
                telefone,
                Number(d.area),
                d.prazo,
                observacoes
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
        // ENDEREÇO DO SERVIÇO
        // ----------------------------------------------------

        await conexao.query(
            `INSERT INTO enderecos_orcamento
                (orcamento_id, cep, estado, cidade, bairro,
                 logradouro, numero, complemento)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orcamentoId, cep, estado, cidade, bairro,
                logradouro, numero, complemento
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
// GET /api/orcamentos   (SOMENTE ADMIN LOGADO)
// Paginação opcional: ?pagina=1&limite=200 (limite máx. 500)
// ============================================================

app.get(
    "/api/orcamentos",
    limiteGet,
    exigirAdmin,
    async function (req, res) {
        try {
            const limite = Math.min(
                Math.max(parseInt(req.query.limite, 10) || 200, 1),
                500
            );
            const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
            const deslocamento = (pagina - 1) * limite;

            const [orcamentos] = await pool.query(
                `SELECT
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
                    c.tipo_cliente AS tipoCliente,
                    o.nome_informado AS nomeInformado,
                    o.email_informado AS emailInformado,
                    o.telefone_informado AS telefoneInformado,
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
                ORDER BY o.criado_em DESC, o.id DESC
                LIMIT ? OFFSET ?`,
                [limite, deslocamento]
            );

            const servicosPorOrcamento = {};

            if (orcamentos.length > 0) {
                const ids = orcamentos.map(o => o.id);

                const [servicos] = await pool.query(
                    `SELECT
                        os.orcamento_id,
                        s.nome,
                        os.outro_descricao
                    FROM orcamento_servicos os
                    JOIN servicos s ON s.id = os.servico_id
                    WHERE os.orcamento_id IN (?)`,
                    [ids]
                );

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
            }

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


/* ============================================================
   PROJETOS - ÁREA ADMINISTRATIVA (SOMENTE ADMIN LOGADO)
   Usa a tabela projetos do banco sabino_gesso.
   Não exclui nem substitui orçamentos existentes.
   ATENÇÃO: estas rotas precisam ficar ANTES do tratamento de
   erros/404 abaixo, senão nunca são alcançadas.
============================================================ */

// GET /api/projetos
// Lista projetos cadastrados e seus dados relacionados.
app.get(
    "/api/projetos",
    limiteGet,
    exigirAdmin,
    async function (req, res) {
        try {
            const [projetos] = await pool.query(`
                SELECT
                    p.id,
                    p.codigo AS projetoCodigo,
                    p.status AS projetoStatus,
                    p.progresso,
                    p.data_inicio AS dataInicio,
                    p.data_previsao AS dataPrevisao,
                    p.data_conclusao AS dataConclusao,
                    p.observacoes AS projetoObservacoes,
                    p.criado_em AS criadoEm,

                    o.id AS orcamentoId,
                    o.codigo AS orcamentoCodigo,
                    o.area,
                    o.prazo,
                    o.valor,
                    o.status AS orcamentoStatus,

                    c.codigo AS clienteCodigo,
                    c.nome AS clienteNome,
                    c.email AS clienteEmail,
                    c.telefone AS clienteTelefone

                FROM projetos p
                INNER JOIN orcamentos o
                    ON o.id = p.orcamento_id
                INNER JOIN clientes c
                    ON c.id = o.cliente_id
                ORDER BY p.criado_em DESC
            `);

            const [servicos] = await pool.query(`
                SELECT
                    os.orcamento_id,
                    s.nome,
                    os.outro_descricao
                FROM orcamento_servicos os
                INNER JOIN servicos s
                    ON s.id = os.servico_id
            `);

            const servicosPorOrcamento = {};

            for (const item of servicos) {
                if (!servicosPorOrcamento[item.orcamento_id]) {
                    servicosPorOrcamento[item.orcamento_id] = [];
                }

                servicosPorOrcamento[item.orcamento_id].push(
                    item.nome === "Outro" && item.outro_descricao
                        ? `Outro: ${item.outro_descricao}`
                        : item.nome
                );
            }

            const resultado = projetos.map(projeto => ({
                ...projeto,
                area: Number(projeto.area),
                valor: Number(projeto.valor),
                progresso: Number(projeto.progresso),
                servicos: servicosPorOrcamento[projeto.orcamentoId] || []
            }));

            return res.json(resultado);

        } catch (erro) {
            console.error("Erro ao listar projetos:", erro);

            return res.status(500).json({
                erro: "Não foi possível carregar os projetos."
            });
        }
    }
);


// POST /api/projetos
// Cria um projeto para um orçamento aprovado.
// O mesmo orçamento não pode gerar dois projetos.
app.post(
    "/api/projetos",
    limiteAdmin,
    exigirAdmin,
    async function (req, res) {
        const orcamentoId = Number((req.body || {}).orcamentoId);

        if (!Number.isInteger(orcamentoId) || orcamentoId <= 0) {
            return res.status(400).json({
                erro: "Informe um ID de orçamento válido."
            });
        }

        let conexao;
        let transacaoIniciada = false;

        try {
            conexao = await pool.getConnection();
            await conexao.beginTransaction();
            transacaoIniciada = true;

            const [orcamentos] = await conexao.query(
                `SELECT id, codigo, status
                 FROM orcamentos
                 WHERE id = ?
                 FOR UPDATE`,
                [orcamentoId]
            );

            if (orcamentos.length === 0) {
                await conexao.rollback();
                transacaoIniciada = false;

                return res.status(404).json({
                    erro: "Orçamento não encontrado."
                });
            }

            const orcamento = orcamentos[0];

            if (orcamento.status !== "Aprovado") {
                await conexao.rollback();
                transacaoIniciada = false;

                return res.status(400).json({
                    erro: "Somente orçamentos aprovados podem virar projetos."
                });
            }

            const [existentes] = await conexao.query(
                `SELECT id, codigo
                 FROM projetos
                 WHERE orcamento_id = ?`,
                [orcamentoId]
            );

            if (existentes.length > 0) {
                await conexao.rollback();
                transacaoIniciada = false;

                return res.status(409).json({
                    erro: "Este orçamento já possui um projeto.",
                    projetoCodigo: existentes[0].codigo
                });
            }

            const [insercao] = await conexao.query(
                `INSERT INTO projetos
                    (orcamento_id, codigo, status, progresso)
                 VALUES (?, ?, 'Em andamento', 0)`,
                [orcamentoId, codigoTemporario()]
            );

            const projetoId = insercao.insertId;
            const codigoProjeto = `PRJ-${pad(projetoId, 4)}`;

            await conexao.query(
                "UPDATE projetos SET codigo = ? WHERE id = ?",
                [codigoProjeto, projetoId]
            );

            await conexao.commit();
            transacaoIniciada = false;

            return res.status(201).json({
                mensagem: "Projeto criado com sucesso.",
                id: projetoId,
                codigo: codigoProjeto,
                orcamentoCodigo: orcamento.codigo
            });

        } catch (erro) {
            if (conexao && transacaoIniciada) {
                try {
                    await conexao.rollback();
                } catch (erroRollback) {
                    console.error("Erro no rollback:", erroRollback);
                }
            }

            console.error("Erro ao criar projeto:", erro);

            return res.status(500).json({
                erro: "Não foi possível criar o projeto."
            });

        } finally {
            if (conexao) conexao.release();
        }
    }
);


// PATCH /api/projetos/:id
// Atualiza status, progresso, datas e observações.
app.patch(
    "/api/projetos/:id",
    limiteAdmin,
    exigirAdmin,
    async function (req, res) {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID de projeto inválido."
            });
        }

        const permitidos = [
            "Em andamento",
            "Pausado",
            "Concluído",
            "Cancelado"
        ];

        const {
            status, progresso, dataInicio, dataPrevisao,
            dataConclusao, observacoes
        } = req.body || {};

        if (status !== undefined && !permitidos.includes(status)) {
            return res.status(400).json({
                erro: "Status de projeto inválido."
            });
        }

        if (
            progresso !== undefined &&
            (!Number.isInteger(Number(progresso)) ||
             Number(progresso) < 0 ||
             Number(progresso) > 100)
        ) {
            return res.status(400).json({
                erro: "O progresso deve ser um número entre 0 e 100."
            });
        }

        const dataValida = valor =>
            valor === null ||
            valor === "" ||
            (typeof valor === "string" &&
             /^\d{4}-\d{2}-\d{2}$/.test(valor));

        for (const data of [dataInicio, dataPrevisao, dataConclusao]) {
            if (data !== undefined && !dataValida(data)) {
                return res.status(400).json({
                    erro: "Data inválida. Use o formato AAAA-MM-DD."
                });
            }
        }

        if (observacoes !== undefined && typeof observacoes !== "string") {
            return res.status(400).json({
                erro: "As observações devem ser um texto."
            });
        }

        try {
            const [existentes] = await pool.query(
                "SELECT id FROM projetos WHERE id = ?",
                [id]
            );

            if (existentes.length === 0) {
                return res.status(404).json({
                    erro: "Projeto não encontrado."
                });
            }

            const campos = [];
            const valores = [];

            if (status !== undefined) {
                campos.push("status = ?");
                valores.push(status);
            }

            if (progresso !== undefined) {
                campos.push("progresso = ?");
                valores.push(Number(progresso));
            }

            if (dataInicio !== undefined) {
                campos.push("data_inicio = ?");
                valores.push(dataInicio || null);
            }

            if (dataPrevisao !== undefined) {
                campos.push("data_previsao = ?");
                valores.push(dataPrevisao || null);
            }

            if (dataConclusao !== undefined) {
                campos.push("data_conclusao = ?");
                valores.push(dataConclusao || null);
            }

            if (observacoes !== undefined) {
                campos.push("observacoes = ?");
                valores.push(observacoes.trim() || null);
            }

            if (campos.length === 0) {
                return res.status(400).json({
                    erro: "Nenhum campo foi informado para atualização."
                });
            }

            valores.push(id);

            await pool.query(
                `UPDATE projetos
                 SET ${campos.join(", ")}
                 WHERE id = ?`,
                valores
            );

            return res.json({
                mensagem: "Projeto atualizado com sucesso."
            });

        } catch (erro) {
            console.error("Erro ao atualizar projeto:", erro);

            return res.status(500).json({
                erro: "Não foi possível atualizar o projeto."
            });
        }
    }
);


// ============================================================
// TRATAMENTO DE ERROS (sempre responde em JSON)
// Precisa ficar DEPOIS de todas as rotas.
// ============================================================

app.use(function (req, res) {
    res.status(404).json({ erro: "Rota não encontrada." });
});

app.use(function (erro, req, res, next) {
    if (erro.type === "entity.parse.failed") {
        return res.status(400).json({ erro: "JSON inválido." });
    }

    if (erro.type === "entity.too.large") {
        return res.status(413).json({ erro: "Requisição muito grande." });
    }

    if (erro.status === 403) {
        return res.status(403).json({ erro: erro.message });
    }

    console.error("Erro não tratado:", erro);

    return res.status(500).json({ erro: "Erro interno do servidor." });
});


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