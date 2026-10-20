// =========================================================
// PAINEL - SABINO GESSO
// Dados carregados diretamente através da API
// =========================================================


// =========================================================
// CONFIGURAÇÃO DA API
// =========================================================

// ALTERE ESTA URL PARA A URL REAL DO SEU BACKEND

const API_URL = "http://localhost:3000/api";


// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        carregarPainel();

    }
);


// =========================================================
// CARREGAR PAINEL
// =========================================================

async function carregarPainel() {

    try {

        /*
            Busca os dados gerais do painel.
        */

        const resposta =
            await fetch(
                `${API_URL}/painel`
            );


        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar os dados do painel."
            );

        }


        const dados =
            await resposta.json();


        /*
            Atualiza os cards
        */

        atualizarResumo(
            dados
        );


        /*
            Atualiza a tabela
        */

        carregarClientes(
            dados.clientes || []
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar painel:",
            erro
        );


        mostrarErro();

    }

}


// =========================================================
// ATUALIZAR CARDS
// =========================================================

function atualizarResumo(
    dados
) {


    // TOTAL DE ORÇAMENTOS

    const totalOrcamentos =
        document.getElementById(
            "totalOrcamentos"
        );


    if (totalOrcamentos) {

        totalOrcamentos.textContent =
            formatarNumero(
                dados.totalOrcamentos
            );

    }



    // NOVOS CLIENTES

    const novosClientes =
        document.getElementById(
            "novosClientes"
        );


    if (novosClientes) {

        novosClientes.textContent =
            formatarNumero(
                dados.novosClientes
            );

    }



    // RECEITA MENSAL

    const receitaMensal =
        document.getElementById(
            "receitaMensal"
        );


    if (receitaMensal) {

        receitaMensal.textContent =
            formatarMoeda(
                dados.receitaMensal
            );

    }

}


// =========================================================
// CARREGAR CLIENTES
// =========================================================

function carregarClientes(
    clientes
) {

    const tabela =
        document.getElementById(
            "tabelaClientes"
        );


    if (!tabela) {
        return;
    }


    tabela.innerHTML = "";


    /*
        Nenhum cliente encontrado
    */

    if (!Array.isArray(clientes) ||
        clientes.length === 0) {

        tabela.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    style="text-align: center;"
                >

                    Nenhum cliente cadastrado.

                </td>

            </tr>

        `;

        return;

    }


    /*
        Criar cada linha
    */

    clientes.forEach(
        function (cliente) {

            const linha =
                document.createElement(
                    "tr"
                );


            // NOME

            const colunaNome =
                document.createElement(
                    "td"
                );

            colunaNome.textContent =
                cliente.nome || "-";


            // EMAIL

            const colunaEmail =
                document.createElement(
                    "td"
                );

            colunaEmail.textContent =
                cliente.email || "-";


            // TELEFONE

            const colunaTelefone =
                document.createElement(
                    "td"
                );

            colunaTelefone.textContent =
                cliente.telefone || "-";


            // STATUS

            const colunaStatus =
                document.createElement(
                    "td"
                );


            const status =
                document.createElement(
                    "span"
                );


            const statusNormalizado =
                normalizarStatus(
                    cliente.status
                );


            status.className =
                "status " +
                obterClasseStatus(
                    statusNormalizado
                );


            status.textContent =
                formatarStatus(
                    cliente.status
                );


            colunaStatus.appendChild(
                status
            );


            // MONTAR LINHA

            linha.appendChild(
                colunaNome
            );

            linha.appendChild(
                colunaEmail
            );

            linha.appendChild(
                colunaTelefone
            );

            linha.appendChild(
                colunaStatus
            );


            tabela.appendChild(
                linha
            );

        }
    );

}


// =========================================================
// STATUS
// =========================================================

function normalizarStatus(
    status
) {

    return String(
        status || ""
    )
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            "-"
        );

}


function obterClasseStatus(
    status
) {

    switch (status) {

        case "aprovado":
            return "status-aprovado";

        case "cancelado":
        case "recusado":
            return "status-recusado";

        case "pendente":
        case "aguardando":
        default:
            return "status-aguardando";

    }

}


function formatarStatus(
    status
) {

    if (!status) {
        return "Pendente";
    }


    const normalizado =
        normalizarStatus(
            status
        );


    switch (normalizado) {

        case "aprovado":
            return "Aprovado";

        case "cancelado":
            return "Cancelado";

        case "recusado":
            return "Recusado";

        case "aguardando":
            return "Pendente";

        case "pendente":
            return "Pendente";

        default:
            return status;

    }

}


// =========================================================
// FORMATAR NÚMERO
// =========================================================

function formatarNumero(
    valor
) {

    const numero =
        Number(valor);


    if (isNaN(numero)) {
        return "0";
    }


    return numero.toLocaleString(
        "pt-BR"
    );

}


// =========================================================
// FORMATAR MOEDA
// =========================================================

function formatarMoeda(
    valor
) {

    const numero =
        Number(valor);


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


// =========================================================
// ERRO
// =========================================================

function mostrarErro() {


    const tabela =
        document.getElementById(
            "tabelaClientes"
        );


    if (tabela) {

        tabela.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    style="
                        text-align: center;
                        color: #e04444;
                    "
                >

                    <i class="bi bi-exclamation-circle"></i>

                    Não foi possível carregar os dados.

                </td>

            </tr>

        `;

    }


    const totalOrcamentos =
        document.getElementById(
            "totalOrcamentos"
        );


    const novosClientes =
        document.getElementById(
            "novosClientes"
        );


    const receitaMensal =
        document.getElementById(
            "receitaMensal"
        );


    if (totalOrcamentos) {
        totalOrcamentos.textContent = "-";
    }


    if (novosClientes) {
        novosClientes.textContent = "-";
    }


    if (receitaMensal) {
        receitaMensal.textContent = "-";
    }

}