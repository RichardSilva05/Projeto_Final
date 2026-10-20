// =========================================================
// CLIENTES - PAINEL SABINO GESSO
// =========================================================
//
// Responsável por:
//
// - Buscar clientes através da API
// - Exibir clientes vindos do banco
// - Pesquisar clientes
// - Gerar iniciais do cliente
// - Exibir telefone e e-mail
// - Exibir quantidade de projetos
// - Abrir detalhes do cliente
//
// =========================================================


// =========================================================
// CONFIGURAÇÃO DA API
// =========================================================

const API_URL = "http://localhost:3000/api";


// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        carregarClientes();

        configurarBusca();

    }
);


// =========================================================
// BUSCAR CLIENTES
// =========================================================

async function carregarClientes() {

    const container =
        document.getElementById(
            "clientesGrid"
        );


    if (!container) {
        return;
    }


    // -----------------------------------------------------
    // MENSAGEM DE CARREGAMENTO
    // -----------------------------------------------------

    container.innerHTML = `

        <div class="carregando-clientes">

            <i class="bi bi-arrow-repeat"></i>

            <span>
                Carregando clientes...
            </span>

        </div>

    `;


    try {

        // -------------------------------------------------
        // CONSULTAR API
        // -------------------------------------------------

        const resposta =
            await fetch(
                `${API_URL}/clientes`
            );


        // -------------------------------------------------
        // VERIFICAR RESPOSTA
        // -------------------------------------------------

        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar os clientes."
            );

        }


        // -------------------------------------------------
        // CONVERTER PARA JSON
        // -------------------------------------------------

        const dados =
            await resposta.json();


        // -------------------------------------------------
        // ACEITAR OS DOIS FORMATOS
        // -------------------------------------------------

        const clientes =
            Array.isArray(dados)
                ? dados
                : dados.clientes || [];


        // -------------------------------------------------
        // LIMPAR CONTAINER
        // -------------------------------------------------

        container.innerHTML = "";


        // -------------------------------------------------
        // NENHUM CLIENTE
        // -------------------------------------------------

        if (
            clientes.length === 0
        ) {

            mostrarNenhumCliente(
                container
            );

            return;

        }


        // -------------------------------------------------
        // CRIAR CARDS
        // -------------------------------------------------

        clientes.forEach(
            function (cliente) {

                const card =
                    criarCardCliente(
                        cliente
                    );

                container.appendChild(
                    card
                );

            }
        );


    }

    catch (erro) {

        console.error(
            "Erro ao carregar clientes:",
            erro
        );


        mostrarErro(
            container
        );

    }

}


// =========================================================
// CRIAR CARD DO CLIENTE
// =========================================================

function criarCardCliente(cliente) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "card-cliente";


    // =====================================================
    // DADOS DO CLIENTE
    // =====================================================

    const nome =
        cliente.nome ||
        cliente.nome_cliente ||
        cliente.cliente_nome ||
        "Cliente não informado";


    const telefone =
        cliente.telefone ||
        cliente.celular ||
        cliente.phone ||
        "Não informado";


    const email =
        cliente.email ||
        cliente.email_cliente ||
        "Não informado";


    const codigo =
        cliente.codigo ||
        cliente.codigo_cliente ||
        cliente.clienteCodigo ||
        cliente.cliente_codigo ||
        cliente.id ||
        "";


    // =====================================================
    // PROJETOS
    // =====================================================

    const quantidadeProjetos =
        Number(
            cliente.quantidadeProjetos ||
            cliente.quantidade_projetos ||
            cliente.totalProjetos ||
            cliente.total_projetos ||
            cliente.projetos ||
            0
        );


    // =====================================================
    // PROJETOS RECENTES
    // =====================================================

    const projetosRecentes =
        obterProjetosRecentes(
            cliente
        );


    // =====================================================
    // AVATAR
    // =====================================================

    const iniciais =
        gerarIniciais(
            nome
        );


    const classeAvatar =
        obterClasseAvatar(
            nome
        );


    // =====================================================
    // HTML DO CARD
    // =====================================================

    card.innerHTML = `

        <div class="cliente-topo">


            <div class="cliente-avatar ${classeAvatar}">

                ${escaparHTML(iniciais)}

            </div>


            <div class="cliente-info">

                <h2>
                    ${escaparHTML(nome)}
                </h2>


                <p>

                    <i class="bi bi-telephone"></i>

                    ${escaparHTML(telefone)}

                </p>


                <p>

                    <i class="bi bi-envelope"></i>

                    ${escaparHTML(email)}

                </p>

            </div>


            <button
                type="button"
                class="btn-menu-cliente"
                title="Opções"
                data-codigo="${escaparHTML(codigo)}"
            >

                <i class="bi bi-three-dots-vertical"></i>

            </button>


        </div>


        <div class="projetos-recentes">

            <strong>
                Projetos recentes:
            </strong>

            <span>
                ${quantidadeProjetos}
                ${quantidadeProjetos === 1
                    ? "projeto"
                    : "projetos"}
            </span>

        </div>


        <p class="projeto">

            <i class="bi bi-file-earmark-text"></i>

            ${escaparHTML(projetosRecentes)}

        </p>


        <div class="cliente-rodape">

            <span>

                ${quantidadeProjetos}

                ${quantidadeProjetos === 1
                    ? "projeto"
                    : "projetos"}

            </span>


            <button
                type="button"
                class="btn-detalhes"
                data-codigo="${escaparHTML(codigo)}"
            >

                Ver Detalhes

            </button>

        </div>

    `;


    // =====================================================
    // BOTÃO DETALHES
    // =====================================================

    const botaoDetalhes =
        card.querySelector(
            ".btn-detalhes"
        );


    if (botaoDetalhes) {

        botaoDetalhes.addEventListener(
            "click",
            function () {

                const codigoCliente =
                    botaoDetalhes.dataset.codigo;


                abrirDetalhesCliente(
                    codigoCliente
                );

            }
        );

    }


    // =====================================================
    // MENU DO CLIENTE
    // =====================================================

    const botaoMenu =
        card.querySelector(
            ".btn-menu-cliente"
        );


    if (botaoMenu) {

        botaoMenu.addEventListener(
            "click",
            function () {

                const codigoCliente =
                    botaoMenu.dataset.codigo;


                if (!codigoCliente) {

                    alert(
                        "Código do cliente não informado."
                    );

                    return;

                }


                abrirDetalhesCliente(
                    codigoCliente
                );

            }
        );

    }


    return card;

}


// =========================================================
// PROJETOS RECENTES
// =========================================================

function obterProjetosRecentes(cliente) {

    // -----------------------------------------------------
    // Caso a API já envie os projetos
    // -----------------------------------------------------

    if (
        Array.isArray(
            cliente.projetos
        )
    ) {

        if (
            cliente.projetos.length === 0
        ) {

            return "Nenhum projeto registrado";

        }


        return cliente.projetos
            .slice(0, 2)
            .map(
                function (projeto) {

                    return (
                        projeto.nome ||
                        projeto.nomeProjeto ||
                        projeto.servico ||
                        projeto.tipo ||
                        "Projeto"
                    );

                }
            )
            .join(", ");

    }


    // -----------------------------------------------------
    // Caso a API envie uma descrição pronta
    // -----------------------------------------------------

    if (
        cliente.projetosRecentes
    ) {

        return cliente.projetosRecentes;

    }


    if (
        cliente.projetos_recentes
    ) {

        return cliente.projetos_recentes;

    }


    if (
        cliente.projetoRecente
    ) {

        return cliente.projetoRecente;

    }


    // -----------------------------------------------------
    // Nenhum projeto
    // -----------------------------------------------------

    return "Nenhum projeto registrado";

}


// =========================================================
// BUSCA
// =========================================================

function configurarBusca() {

    const campo =
        document.getElementById(
            "buscarCliente"
        );


    if (!campo) {
        return;
    }


    campo.addEventListener(
        "input",
        function () {

            const termo =
                campo.value
                    .toLowerCase()
                    .trim();


            filtrarClientes(
                termo
            );

        }
    );

}


// =========================================================
// FILTRAR CLIENTES
// =========================================================

function filtrarClientes(termo) {

    const cards =
        document.querySelectorAll(
            ".card-cliente"
        );


    cards.forEach(
        function (card) {

            const texto =
                card.textContent
                    .toLowerCase();


            if (
                texto.includes(termo)
            ) {

                card.style.display =
                    "";

            }

            else {

                card.style.display =
                    "none";

            }

        }
    );

}


// =========================================================
// ABRIR DETALHES
// =========================================================

function abrirDetalhesCliente(
    codigo
) {

    if (!codigo) {

        alert(
            "Não foi possível identificar o cliente."
        );

        return;

    }


    /*
     * Aqui usamos uma página única
     * para qualquer cliente.
     *
     * Exemplo:
     *
     * clientes-detalhes.html?codigo=CLI-0001
     */

    window.location.href =
        "detalhes-cliente.html?codigo=" +
        encodeURIComponent(
            codigo
        );

}


// =========================================================
// GERAR INICIAIS
// =========================================================

function gerarIniciais(nome) {

    if (!nome) {
        return "CL";
    }


    const partes =
        String(nome)
            .trim()
            .split(/\s+/);


    if (
        partes.length === 1
    ) {

        return partes[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        partes[0][0] +
        partes[partes.length - 1][0]
    ).toUpperCase();

}


// =========================================================
// COR DO AVATAR
// =========================================================

function obterClasseAvatar(nome) {

    const classes = [

        "avatar-vermelho",
        "avatar-azul",
        "avatar-cinza",
        "avatar-laranja",
        "avatar-verde",
        "avatar-roxo"

    ];


    let valor = 0;


    for (
        let i = 0;
        i < nome.length;
        i++
    ) {

        valor +=
            nome.charCodeAt(i);

    }


    return classes[
        valor % classes.length
    ];

}


// =========================================================
// NENHUM CLIENTE
// =========================================================

function mostrarNenhumCliente(
    container
) {

    container.innerHTML = `

        <div class="nenhum-cliente">

            <i class="bi bi-people"></i>

            <h2>
                Nenhum cliente cadastrado
            </h2>

            <p>
                Os clientes cadastrados aparecerão aqui.
            </p>

        </div>

    `;

}


// =========================================================
// ERRO
// =========================================================

function mostrarErro(
    container
) {

    container.innerHTML = `

        <div class="nenhum-cliente">

            <i class="bi bi-exclamation-circle"></i>

            <h2>
                Não foi possível carregar os clientes
            </h2>

            <p>
                Verifique a conexão com o servidor.
            </p>

        </div>

    `;

}


// =========================================================
// PROTEÇÃO CONTRA HTML
// =========================================================

function escaparHTML(valor) {

    return String(valor || "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}