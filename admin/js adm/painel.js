// =========================================================
// PAINEL - SABINO GESSO
// Dados carregados do banco através da API (rota protegida)
// =========================================================


// =========================================================
// CONFIGURAÇÃO DA API
// =========================================================

// ALTERE ESTA URL PARA A URL REAL DO SEU BACKEND

const API_URL = "http://localhost:3000/api";


// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    carregarPainel();

});


// =========================================================
// CARREGAR PAINEL
// =========================================================

async function carregarPainel() {

    const token = sessionStorage.getItem("tokenAdmin");

    // Sem login: volta para a tela de login
    if (!token) {
        window.location.replace("login.html");
        return;
    }

    try {

        const resposta = await fetch(
            `${API_URL}/painel`,
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        // Token vencido ou inválido
        if (resposta.status === 401) {

            sessionStorage.removeItem("tokenAdmin");
            window.location.replace("login.html");
            return;

        }

        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar os dados do painel."
            );

        }

        const dados = await resposta.json();

        atualizarResumo(dados);
        carregarClientes(dados.clientes || []);

    } catch (erro) {

        console.error("Erro ao carregar painel:", erro);

        mostrarErro();

    }

}


// =========================================================
// ATUALIZAR CARDS
// =========================================================

function atualizarResumo(dados) {

    definirTexto(
        "totalOrcamentos",
        formatarNumero(dados.totalOrcamentos)
    );

    definirTexto(
        "novosClientes",
        formatarNumero(dados.novosClientes)
    );

    definirTexto(
        "receitaMensal",
        formatarMoeda(dados.receitaMensal)
    );

}


function definirTexto(id, texto) {

    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = texto;
    }

}


// =========================================================
// TABELA DE CLIENTES
// =========================================================

function criarLinhaMensagem(texto, cor) {

    const linha = document.createElement("tr");
    const coluna = document.createElement("td");

    coluna.colSpan = 4;
    coluna.style.textAlign = "center";

    if (cor) {
        coluna.style.color = cor;
    }

    coluna.textContent = texto;

    linha.appendChild(coluna);

    return linha;

}


function carregarClientes(clientes) {

    const tabela = document.getElementById("tabelaClientes");

    if (!tabela) {
        return;
    }

    tabela.innerHTML = "";

    // Nenhum cliente encontrado
    if (!Array.isArray(clientes) || clientes.length === 0) {

        tabela.appendChild(
            criarLinhaMensagem("Nenhum cliente cadastrado.")
        );

        return;

    }

    // Os dados vêm de formulários públicos: textContent (nunca
    // innerHTML) impede que alguém injete código na página.
    clientes.forEach(function (cliente) {

        const linha = document.createElement("tr");

        // NOME

        const colunaNome = document.createElement("td");
        colunaNome.textContent = cliente.nome || "-";

        // EMAIL

        const colunaEmail = document.createElement("td");
        colunaEmail.textContent = cliente.email || "-";

        // TELEFONE

        const colunaTelefone = document.createElement("td");
        colunaTelefone.textContent = formatarTelefone(cliente.telefone);

        // STATUS

        const colunaStatus = document.createElement("td");

        colunaStatus.appendChild(criarSeletorStatus(cliente));

        // MONTAR LINHA

        linha.appendChild(colunaNome);
        linha.appendChild(colunaEmail);
        linha.appendChild(colunaTelefone);
        linha.appendChild(colunaStatus);

        tabela.appendChild(linha);

    });

}


// =========================================================
// MUDAR STATUS (Pendente / Em análise / Aprovado)
// =========================================================

// valor = o que o banco guarda | rotulo = o que aparece na tela
const OPCOES_STATUS = [
    { valor: "Aguardando", rotulo: "Pendente" },
    { valor: "Em análise", rotulo: "Em análise" },
    { valor: "Aprovado", rotulo: "Aprovado" }
];


function estilizarStatus(elemento, status) {

    elemento.className =
        "status " + obterClasseStatus(normalizarStatus(status));

}


function criarSeletorStatus(cliente) {

    const atual = cliente.status || "Aguardando";

    const editavel =
        cliente.orcamentoId &&
        OPCOES_STATUS.some(function (o) {
            return o.valor === atual;
        });

    // Sem orçamento, ou com status fora das 3 opções
    // (Recusado, Cancelado, Concluído): mostra só o texto.
    if (!editavel) {

        const texto = document.createElement("span");

        estilizarStatus(texto, atual);
        texto.textContent = formatarStatus(atual);

        return texto;

    }

    const seletor = document.createElement("select");

    seletor.setAttribute(
        "aria-label",
        "Status do orçamento " + (cliente.orcamentoCodigo || "")
    );

    OPCOES_STATUS.forEach(function (opcao) {

        const item = document.createElement("option");

        item.value = opcao.valor;
        item.textContent = opcao.rotulo;

        seletor.appendChild(item);

    });

    seletor.value = atual;
    seletor.dataset.anterior = atual;

    estilizarStatus(seletor, atual);

    seletor.style.cssText =
        "border:0;cursor:pointer;font:inherit;" +
        "border-radius:20px;padding:4px 10px;";

    seletor.addEventListener("change", function () {

        alterarStatus(seletor, cliente);

    });

    return seletor;

}


async function alterarStatus(seletor, cliente) {

    const novo = seletor.value;
    const anterior = seletor.dataset.anterior;

    seletor.disabled = true;

    try {

        const resposta = await fetch(
            `${API_URL}/orcamentos/${cliente.orcamentoId}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization:
                        "Bearer " + sessionStorage.getItem("tokenAdmin")
                },
                body: JSON.stringify({ status: novo })
            }
        );

        // Token vencido ou inválido
        if (resposta.status === 401) {

            sessionStorage.removeItem("tokenAdmin");
            window.location.replace("login.html");
            return;

        }

        const dados = await resposta.json().catch(function () {
            return {};
        });

        if (!resposta.ok) {

            throw new Error(
                dados.erro || "Não foi possível alterar o status."
            );

        }

        seletor.dataset.anterior = novo;
        estilizarStatus(seletor, novo);

        // Atualiza os cards (a receita depende do status)
        carregarPainel();

    } catch (erro) {

        // Volta para o status que estava antes
        seletor.value = anterior;
        estilizarStatus(seletor, anterior);

        alert(erro.message || "Não foi possível alterar o status.");

    } finally {

        seletor.disabled = false;

    }

}


// =========================================================
// STATUS
// =========================================================

function normalizarStatus(status) {

    return String(status || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

}


function obterClasseStatus(status) {

    switch (status) {

        case "aprovado":
        case "concluido":
            return "status-aprovado";

        case "cancelado":
        case "recusado":
            return "status-recusado";

        case "em-analise":
            return "status-analise";

        case "pendente":
        case "aguardando":
        default:
            return "status-aguardando";

    }

}


function formatarStatus(status) {

    if (!status) {
        return "Pendente";
    }

    switch (normalizarStatus(status)) {

        case "aprovado":
            return "Aprovado";

        case "concluido":
            return "Concluído";

        case "cancelado":
            return "Cancelado";

        case "recusado":
            return "Recusado";

        case "em-analise":
            return "Em análise";

        case "aguardando":
        case "pendente":
            return "Pendente";

        default:
            return status;

    }

}


// =========================================================
// FORMATAÇÃO
// =========================================================

function formatarNumero(valor) {

    const numero = Number(valor);

    if (isNaN(numero)) {
        return "0";
    }

    return numero.toLocaleString("pt-BR");

}


function formatarMoeda(valor) {

    const numero = Number(valor);

    if (isNaN(numero)) {
        return "R$ 0,00";
    }

    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


// O banco guarda só os dígitos: 47999999999 -> (47) 99999-9999
function formatarTelefone(telefone) {

    const d = String(telefone || "").replace(/\D/g, "");

    if (d.length === 11) {
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    if (d.length === 10) {
        return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    }

    return telefone || "-";

}


// =========================================================
// ERRO
// =========================================================

function mostrarErro() {

    const tabela = document.getElementById("tabelaClientes");

    if (tabela) {

        tabela.innerHTML = "";

        tabela.appendChild(
            criarLinhaMensagem(
                "Não foi possível carregar os dados.",
                "#e04444"
            )
        );

    }

    definirTexto("totalOrcamentos", "-");
    definirTexto("novosClientes", "-");
    definirTexto("receitaMensal", "-");

}