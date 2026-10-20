// =========================================================
// ORÇAMENTOS - PAINEL SABINO GESSO
// =========================================================
// Responsável por:
//
// - Buscar os orçamentos através da API
// - Exibir os dados vindos do banco
// - Formatar data
// - Formatar valor
// - Exibir status
// - Ordenar por data
// - Abrir detalhes do orçamento
// =========================================================


// =========================================================
// CONFIGURAÇÃO DA API
// =========================================================

const API_URL = "http://localhost:3000/api";


// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    carregarOrcamentos();

    configurarOrdenacao();

    configurarNovoOrcamento();

});


// =========================================================
// BUSCAR ORÇAMENTOS
// =========================================================

async function carregarOrcamentos() {

    const tabela =
        document.getElementById("tabelaOrcamentos");

    const corpo =
        document.getElementById("corpoOrcamentos");


    if (!tabela || !corpo) {
        return;
    }


    // -----------------------------------------------------
    // MENSAGEM DE CARREGAMENTO
    // -----------------------------------------------------

    corpo.innerHTML = `
        <tr>
            <td colspan="6" class="carregando">
                <i class="bi bi-arrow-repeat"></i>
                Carregando orçamentos...
            </td>
        </tr>
    `;


    try {

        // -------------------------------------------------
        // CONSULTA À API
        // -------------------------------------------------

        const resposta =
            await fetch(`${API_URL}/orcamentos`);


        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar os orçamentos."
            );

        }


        // -------------------------------------------------
        // CONVERTER RESPOSTA PARA JSON
        // -------------------------------------------------

        const dados =
            await resposta.json();


        // -------------------------------------------------
        // GARANTIR QUE TEMOS UMA LISTA
        // -------------------------------------------------

        const orcamentos =
            Array.isArray(dados)
                ? dados
                : dados.orcamentos || [];


        // -------------------------------------------------
        // LIMPAR TABELA
        // -------------------------------------------------

        corpo.innerHTML = "";


        // -------------------------------------------------
        // NENHUM ORÇAMENTO
        // -------------------------------------------------

        if (orcamentos.length === 0) {

            corpo.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="sem-orcamentos"
                    >
                        <i class="bi bi-receipt"></i>

                        <div>
                            Nenhum orçamento cadastrado.
                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        // -------------------------------------------------
        // ADICIONAR ORÇAMENTOS
        // -------------------------------------------------

        orcamentos.forEach(function (orcamento) {

            const linha =
                criarLinhaOrcamento(orcamento);

            corpo.appendChild(linha);

        });

    }

    catch (erro) {

        console.error(
            "Erro ao carregar orçamentos:",
            erro
        );


        mostrarErro(corpo);

    }

}


// =========================================================
// CRIAR LINHA DO ORÇAMENTO
// =========================================================

function criarLinhaOrcamento(orcamento) {

    const linha =
        document.createElement("tr");


    // -----------------------------------------------------
    // DATA PARA ORDENAÇÃO
    // -----------------------------------------------------

    linha.dataset.data =
        orcamento.data ||
        orcamento.created_at ||
        "";


    linha.dataset.codigo =
        orcamento.codigo ||
        orcamento.codigo_orcamento ||
        orcamento.id ||
        "";


    // =====================================================
    // CLIENTE
    // =====================================================

    const colunaCliente =
        document.createElement("td");


    colunaCliente.textContent =
        orcamento.clienteNome ||
        orcamento.cliente_nome ||
        orcamento.nome_cliente ||
        orcamento.nome ||
        "-";


    // =====================================================
    // CÓDIGO
    // =====================================================

    const colunaCodigo =
        document.createElement("td");


    const codigo =
        document.createElement("span");


    codigo.className =
        "codigo-cliente";


    codigo.textContent =
        orcamento.clienteCodigo ||
        orcamento.cliente_codigo ||
        orcamento.codigo_cliente ||
        "-";


    colunaCodigo.appendChild(codigo);


    // =====================================================
    // DATA
    // =====================================================

    const colunaData =
        document.createElement("td");


    colunaData.textContent =
        formatarData(
            orcamento.data ||
            orcamento.created_at
        );


    // =====================================================
    // VALOR
    // =====================================================

    const colunaValor =
        document.createElement("td");


    colunaValor.textContent =
        formatarValor(
            orcamento.valor
        );


    // =====================================================
    // STATUS
    // =====================================================

    const colunaStatus =
        document.createElement("td");


    const status =
        document.createElement("span");


    const statusAtual =
        orcamento.status ||
        "Aguardando";


    status.className =
        "status " +
        obterClasseStatus(statusAtual);


    status.textContent =
        formatarStatus(statusAtual);


    colunaStatus.appendChild(status);


    // =====================================================
    // DETALHES
    // =====================================================

    const colunaDetalhes =
        document.createElement("td");


    const botaoDetalhes =
        document.createElement("button");


    botaoDetalhes.type =
        "button";


    botaoDetalhes.className =
        "btn-ver-detalhes";


    botaoDetalhes.textContent =
        "Ver Detalhes";


    botaoDetalhes.dataset.codigo =
        orcamento.codigo ||
        orcamento.codigo_orcamento ||
        orcamento.id ||
        "";


    botaoDetalhes.addEventListener(
        "click",
        function () {

            abrirDetalhes(
                botaoDetalhes.dataset.codigo
            );

        }
    );


    colunaDetalhes.appendChild(
        botaoDetalhes
    );


    // =====================================================
    // MONTAR LINHA
    // =====================================================

    linha.appendChild(
        colunaCliente
    );

    linha.appendChild(
        colunaCodigo
    );

    linha.appendChild(
        colunaData
    );

    linha.appendChild(
        colunaValor
    );

    linha.appendChild(
        colunaStatus
    );

    linha.appendChild(
        colunaDetalhes
    );


    return linha;

}


// =========================================================
// FORMATAR DATA
// =========================================================

function formatarData(data) {

    if (!data) {
        return "-";
    }


    const dataObj =
        new Date(data);


    if (
        isNaN(
            dataObj.getTime()
        )
    ) {

        return "-";

    }


    return dataObj.toLocaleDateString(
        "pt-BR"
    );

}


// =========================================================
// FORMATAR VALOR
// =========================================================

function formatarValor(valor) {

    const numero =
        Number(valor);


    if (
        isNaN(numero)
    ) {

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


// =========================================================
// CLASSE DO STATUS
// =========================================================

function obterClasseStatus(status) {

    const statusNormalizado =
        String(status || "")
            .toLowerCase()
            .trim();


    if (
        statusNormalizado ===
        "aprovado"
    ) {

        return "status-aprovado";

    }


    if (
        statusNormalizado ===
        "recusado"
    ) {

        return "status-recusado";

    }


    return "status-aguardando";

}


// =========================================================
// TEXTO DO STATUS
// =========================================================

function formatarStatus(status) {

    const normalizado =
        String(status || "")
            .toLowerCase()
            .trim();


    if (
        normalizado ===
        "aprovado"
    ) {

        return "Aprovado";

    }


    if (
        normalizado ===
        "recusado"
    ) {

        return "Recusado";

    }


    if (
        normalizado ===
        "cancelado"
    ) {

        return "Cancelado";

    }


    return "Aguardando";

}


// =========================================================
// ORDENAR POR DATA
// =========================================================

function configurarOrdenacao() {

    const tabela =
        document.getElementById(
            "tabelaOrcamentos"
        );


    const colunaData =
        document.getElementById(
            "colunaData"
        );


    if (
        !tabela ||
        !colunaData
    ) {

        return;

    }


    colunaData.addEventListener(
        "click",
        function () {

            ordenarPorData(
                tabela,
                colunaData
            );

        }
    );

}


// =========================================================
// ORDENAR
// =========================================================

function ordenarPorData(
    tabela,
    coluna
) {

    const corpo =
        tabela.querySelector(
            "tbody"
        );


    if (!corpo) {
        return;
    }


    const linhas =
        Array.from(
            corpo.querySelectorAll(
                "tr"
            )
        );


    const crescente =
        coluna.classList.toggle(
            "ordem-crescente"
        );


    linhas.sort(
        function (a, b) {

            const dataA =
                new Date(
                    a.dataset.data
                );


            const dataB =
                new Date(
                    b.dataset.data
                );


            if (
                isNaN(
                    dataA.getTime()
                )
            ) {

                return 1;

            }


            if (
                isNaN(
                    dataB.getTime()
                )
            ) {

                return -1;

            }


            return crescente
                ? dataA - dataB
                : dataB - dataA;

        }
    );


    linhas.forEach(
        function (linha) {

            corpo.appendChild(
                linha
            );

        }
    );

}


// =========================================================
// ABRIR DETALHES
// =========================================================

function abrirDetalhes(codigo) {

    if (!codigo) {

        alert(
            "Não foi possível identificar o orçamento."
        );

        return;

    }


    window.location.href =
        "detalhes-projeto.html?codigo=" +
        encodeURIComponent(codigo);

}


// =========================================================
// NOVO ORÇAMENTO
// =========================================================

function configurarNovoOrcamento() {

    const botao =
        document.getElementById(
            "btnNovoOrcamento"
        );


    if (!botao) {
        return;
    }


    botao.addEventListener(
        "click",
        function () {

            window.location.href =
                "novo-orcamento.html";

        }
    );

}


// =========================================================
// ERRO
// =========================================================

function mostrarErro(corpo) {

    corpo.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="sem-orcamentos"
            >
                <i class="bi bi-exclamation-circle"></i>

                <div>
                    Não foi possível carregar os orçamentos.
                </div>

                <small>
                    Verifique a conexão com o servidor.
                </small>
            </td>
        </tr>
    `;

}