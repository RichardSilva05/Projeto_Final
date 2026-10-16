
/* ============================================================
   FORMULÁRIO DE ORÇAMENTO PJ - SABINO GESSO

   - Máscaras de CNPJ, telefone e CEP
   - Validação de CNPJ e e-mail
   - Estados e cidades pela API do IBGE
   - Endereço automático pelo CEP (ViaCEP)
   - Envio ao banco de dados
   - Geração de PDF após salvar
   - Envio pelo WhatsApp
   - Não apaga registros anteriores
============================================================ */

"use strict";

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const API_URL = "http://localhost:3000/api/orcamentos/pj";
const NUMERO_WHATSAPP_EMPRESA = "5511999999999";

const IBGE_URL =
    "https://servicodados.ibge.gov.br/api/v1/localidades";

const VIACEP_URL = "https://viacep.com.br/ws";

const UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

let estadosCarregamento = Promise.resolve();
let consultaCEPAtual = 0;
let consultaCidadesAtual = 0;
let ultimoCEPConsultado = "";
let cepEmConsulta = "";
let envioEmAndamento = false;

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function obterCampo(id) {
    return document.getElementById(id);
}

function somenteNumeros(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("pt-BR");
}

function preencherSelect(select, placeholder, itens) {
    if (!select) return;

    select.innerHTML = "";

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = placeholder;

    select.appendChild(opcaoInicial);

    itens.forEach(item => {
        const opcao = document.createElement("option");

        opcao.value = item.valor;
        opcao.textContent = item.texto;

        select.appendChild(opcao);
    });
}

// ============================================================
// MÁSCARA CNPJ
// ============================================================

function aplicarMascaraCNPJ(valor) {
    let n = somenteNumeros(valor).slice(0, 14);

    n = n.replace(/^(\d{2})(\d)/, "$1.$2");
    n = n.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    n = n.replace(/\.(\d{3})(\d)/, ".$1/$2");
    n = n.replace(/(\d{4})(\d{1,2})$/, "$1-$2");

    return n;
}

// ============================================================
// MÁSCARA TELEFONE
// ============================================================

function aplicarMascaraTelefone(valor) {
    let n = somenteNumeros(valor).slice(0, 11);

    if (n.length <= 10) {
        n = n.replace(/^(\d{2})(\d)/, "($1) $2");
        n = n.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        n = n.replace(/^(\d{2})(\d)/, "($1) $2");
        n = n.replace(/(\d{5})(\d)/, "$1-$2");
    }

    return n;
}

// ============================================================
// MÁSCARA CEP
// ============================================================

function aplicarMascaraCEP(valor) {
    let n = somenteNumeros(valor).slice(0, 8);

    if (n.length > 5) {
        n = n.slice(0, 5) + "-" + n.slice(5);
    }

    return n;
}

// ============================================================
// VALIDAÇÃO CNPJ
// ============================================================

function validarCNPJ(valor) {
    const cnpj = somenteNumeros(valor);

    if (
        cnpj.length !== 14 ||
        /^(\d)\1{13}$/.test(cnpj)
    ) {
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

    const segundo = calcularDigito(
        cnpj.slice(0, 12) + primeiro
    );

    return cnpj === cnpj.slice(0, 12) + primeiro + segundo;
}

// ============================================================
// VALIDAÇÃO DE E-MAIL
// ============================================================

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// STATUS DO CEP
// Cria o elemento de status se ele não existir no HTML.
// ============================================================

function mostrarStatusCep(mensagem, tipo = "info") {
    const campoCEP = obterCampo("cep");

    if (!campoCEP) return;

    let status = obterCampo("cepStatus");

    if (!status) {
        status = document.createElement("small");
        status.id = "cepStatus";
        status.className = "d-block mb-2";

        campoCEP.insertAdjacentElement("afterend", status);
    }

    status.textContent = mensagem;

    status.className =
        "d-block mb-2 " +
        (
            tipo === "ok"
                ? "text-success"
                : tipo === "erro"
                    ? "text-danger"
                    : "text-muted"
        );
}

// ============================================================
// CARREGAR ESTADOS
// ============================================================

async function carregarEstados() {
    const campo = obterCampo("estado");

    if (!campo) return;

    const estadosLocais = [
        ["AC", "Acre"],
        ["AL", "Alagoas"],
        ["AP", "Amapá"],
        ["AM", "Amazonas"],
        ["BA", "Bahia"],
        ["CE", "Ceará"],
        ["DF", "Distrito Federal"],
        ["ES", "Espírito Santo"],
        ["GO", "Goiás"],
        ["MA", "Maranhão"],
        ["MT", "Mato Grosso"],
        ["MS", "Mato Grosso do Sul"],
        ["MG", "Minas Gerais"],
        ["PA", "Pará"],
        ["PB", "Paraíba"],
        ["PR", "Paraná"],
        ["PE", "Pernambuco"],
        ["PI", "Piauí"],
        ["RJ", "Rio de Janeiro"],
        ["RN", "Rio Grande do Norte"],
        ["RS", "Rio Grande do Sul"],
        ["RO", "Rondônia"],
        ["RR", "Roraima"],
        ["SC", "Santa Catarina"],
        ["SP", "São Paulo"],
        ["SE", "Sergipe"],
        ["TO", "Tocantins"]
    ];

    // Preenche os estados localmente para não depender da API.
    preencherSelect(
        campo,
        "Estado",
        estadosLocais.map(([sigla, nome]) => ({
            valor: sigla,
            texto: nome
        }))
    );

    campo.disabled = false;
}

// ============================================================
// CARREGAR CIDADES PELO IBGE
// ============================================================

async function carregarCidades(uf, cidadeSelecionada = "") {
    const campo = obterCampo("cidade");

    if (!campo) return;

    const minhaConsulta = ++consultaCidadesAtual;
    const cidadeAlvo = String(cidadeSelecionada || "").trim();

    if (!uf) {
        preencherSelect(campo, "Cidade", []);
        campo.disabled = true;
        return;
    }

    // Deixa a cidade recebida do CEP disponível imediatamente.
    preencherSelect(
        campo,
        "Cidade",
        cidadeAlvo
            ? [{ valor: cidadeAlvo, texto: cidadeAlvo }]
            : []
    );

    if (cidadeAlvo) {
        campo.value = cidadeAlvo;
    }

    campo.disabled = !cidadeAlvo;

    const controlador = new AbortController();

    const temporizador = setTimeout(
        () => controlador.abort(),
        8000
    );

    try {
        const resposta = await fetch(
            `${IBGE_URL}/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`,
            { signal: controlador.signal }
        );

        if (!resposta.ok) {
            throw new Error(
                `Falha ao carregar municípios: HTTP ${resposta.status}`
            );
        }

        const cidades = await resposta.json();

        if (!Array.isArray(cidades)) {
            throw new Error("A API do IBGE não retornou uma lista válida.");
        }

        if (minhaConsulta !== consultaCidadesAtual) return;

        cidades.sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR")
        );

        preencherSelect(
            campo,
            "Cidade",
            cidades.map(item => ({
                valor: item.nome,
                texto: item.nome
            }))
        );

    } catch (erro) {
        if (minhaConsulta !== consultaCidadesAtual) return;

        console.warn(
            "Não foi possível carregar a lista do IBGE:",
            erro
        );

    } finally {
        clearTimeout(temporizador);
    }

    if (minhaConsulta !== consultaCidadesAtual) return;

    // Preserva a cidade retornada pelo CEP mesmo se o IBGE falhar.
    if (cidadeAlvo) {
        let opcao = Array.from(campo.options).find(
            item =>
                normalizarTexto(item.value) ===
                normalizarTexto(cidadeAlvo)
        );

        if (!opcao) {
            opcao = document.createElement("option");
            opcao.value = cidadeAlvo;
            opcao.textContent = cidadeAlvo;

            campo.appendChild(opcao);
        }

        campo.value = opcao.value;
    }

    campo.disabled = false;
}

// ============================================================
// LIMPAR ENDEREÇO
// ============================================================

function limparEndereco() {
    const estado = obterCampo("estado");
    const cidade = obterCampo("cidade");
    const bairro = obterCampo("bairro");
    const logradouro = obterCampo("logradouro");
    const complemento = obterCampo("complemento");

    if (estado) {
        estado.value = "";
    }

    if (cidade) {
        ++consultaCidadesAtual;

        preencherSelect(cidade, "Cidade", []);

        cidade.disabled = true;
    }

    if (bairro) bairro.value = "";
    if (logradouro) logradouro.value = "";
    if (complemento) complemento.value = "";
}

// ============================================================
// CONSULTAR CEP PELO VIACEP
// Preenche o endereço ANTES de carregar os municípios.
// ============================================================

async function buscarCEP() {
    const campoCEP = obterCampo("cep");

    if (!campoCEP) return;

    const cep = somenteNumeros(campoCEP.value);

    if (cep.length !== 8) return;

    // Evita duas consultas seguidas para o mesmo CEP.
    if (
        cep === ultimoCEPConsultado ||
        cep === cepEmConsulta
    ) {
        return;
    }

    const minhaConsulta = ++consultaCEPAtual;

    cepEmConsulta = cep;

    const consultaValida = () =>
        minhaConsulta === consultaCEPAtual &&
        cep === somenteNumeros(campoCEP.value);

    const controlador = new AbortController();

    const temporizador = setTimeout(
        () => controlador.abort(),
        8000
    );

    mostrarStatusCep("Consultando CEP...", "info");

    try {
        // Aguarda os estados serem preparados.
        await estadosCarregamento;

        if (!consultaValida()) return;

        const resposta = await fetch(
            `${VIACEP_URL}/${cep}/json/`,
            { signal: controlador.signal }
        );

        if (!resposta.ok) {
            throw new Error(
                `Falha no ViaCEP: HTTP ${resposta.status}`
            );
        }

        const dados = await resposta.json();

        if (!consultaValida()) return;

        if (
            dados.erro ||
            !dados.uf ||
            !dados.localidade
        ) {
            mostrarStatusCep(
                "CEP não encontrado. Confira o número informado.",
                "erro"
            );

            alert("CEP não encontrado. Confira o número informado.");

            return;
        }

        const estado = obterCampo("estado");
        const cidade = obterCampo("cidade");
        const bairro = obterCampo("bairro");
        const logradouro = obterCampo("logradouro");
        const complemento = obterCampo("complemento");

        if (!estado || !cidade) {
            throw new Error(
                "Não foram encontrados os campos de estado e cidade no HTML."
            );
        }

        const uf = String(dados.uf).toUpperCase();

        // ----------------------------------------------------
        // 1. PREENCHER ESTADO
        // ----------------------------------------------------

        let opcaoEstado = Array.from(estado.options).find(
            opcao => opcao.value.toUpperCase() === uf
        );

        if (!opcaoEstado) {
            opcaoEstado = document.createElement("option");
            opcaoEstado.value = uf;
            opcaoEstado.textContent = uf;

            estado.appendChild(opcaoEstado);
        }

        estado.value = uf;
        estado.disabled = false;

        // ----------------------------------------------------
        // 2. PREENCHER O ENDEREÇO IMEDIATAMENTE
        // Não depende da lista de municípios do IBGE.
        // ----------------------------------------------------

        if (bairro) {
            bairro.value = dados.bairro || "";
        }

        if (logradouro) {
            logradouro.value = dados.logradouro || "";
        }

        if (complemento) {
            complemento.value = dados.complemento || "";
        }

        // ----------------------------------------------------
        // 3. PREENCHER A CIDADE IMEDIATAMENTE
        // ----------------------------------------------------

        preencherSelect(cidade, "Cidade", [
            {
                valor: dados.localidade,
                texto: dados.localidade
            }
        ]);

        cidade.value = dados.localidade;
        cidade.disabled = false;

        // Marca o CEP como consultado.
        ultimoCEPConsultado = cep;

        mostrarStatusCep(
            "Endereço encontrado. Informe o número e confira os dados.",
            "ok"
        );

        // ----------------------------------------------------
        // 4. CARREGAR A LISTA COMPLETA DO IBGE
        // A falha nesta etapa não apaga o endereço preenchido.
        // ----------------------------------------------------

        try {
            await carregarCidades(uf, dados.localidade);
        } catch (erroCidades) {
            console.warn("Falha ao carregar cidades:", erroCidades);
        }

    } catch (erro) {
        if (!consultaValida()) return;

        // Permite tentar novamente depois de uma falha.
        ultimoCEPConsultado = "";

        console.error("Erro ao consultar CEP:", erro);

        mostrarStatusCep(
            "Não foi possível consultar o CEP. Confira sua conexão e tente novamente.",
            "erro"
        );

        alert(
            "Não foi possível consultar o CEP pelo ViaCEP.\n" +
            "Verifique a conexão e tente novamente."
        );

    } finally {
        clearTimeout(temporizador);

        if (cepEmConsulta === cep) {
            cepEmConsulta = "";
        }
    }
}

// ============================================================
// OBTER SERVIÇOS
// ============================================================

function obterServicos() {
    return Array.from(
        document.querySelectorAll('input[name="servicos"]:checked')
    ).map(item => item.value);
}

// ============================================================
// OBTER PRAZO
// ============================================================

function obterPrazo() {
    return document.querySelector(
        'input[name="prazo"]:checked'
    )?.value || "";
}

// ============================================================
// COLETAR DADOS DO FORMULÁRIO
// ============================================================

function obterDadosFormulario() {
    const estado = obterCampo("estado");
    const servicosSelecionados = obterServicos();
    const campoOutroTexto = obterCampo("servicoOutroTexto");

    const outroDescricao = campoOutroTexto
        ? campoOutroTexto.value.trim()
        : "";

    return {
        razaoSocial: obterCampo("razaoSocial").value.trim(),
        nomeFantasia: obterCampo("nomeFantasia").value.trim(),
        cnpj: obterCampo("cnpj").value.trim(),
        email: obterCampo("email").value.trim(),
        telefone: obterCampo("telefone").value.trim(),
        responsavel: obterCampo("responsavel").value.trim(),

        area: Number(
            obterCampo("area").value.replace(",", ".")
        ),

        prazo: obterPrazo(),
        cep: obterCampo("cep").value.trim(),
        estado: estado.value,
        estadoTexto: estado.selectedOptions[0]?.text || "",
        cidade: obterCampo("cidade").value.trim(),
        bairro: obterCampo("bairro").value.trim(),
        logradouro: obterCampo("logradouro").value.trim(),
        numero: obterCampo("numero").value.trim(),
        complemento: obterCampo("complemento").value.trim(),

        servicos: servicosSelecionados.filter(
            nome => nome !== "Outro"
        ),

        outroDescricao: servicosSelecionados.includes("Outro")
            ? outroDescricao
            : ""
    };
}

// ============================================================
// VALIDAR FORMULÁRIO
// ============================================================

function validarDados(d) {
    if (!validarCNPJ(d.cnpj)) {
        return "Informe um CNPJ válido.";
    }

    if (!validarEmail(d.email)) {
        return "Informe um e-mail válido.";
    }

    if (
        !d.razaoSocial ||
        !d.nomeFantasia ||
        !d.responsavel
    ) {
        return "Preencha os dados da empresa e do responsável.";
    }

    const telefone = somenteNumeros(d.telefone);

    if (telefone.length !== 10 && telefone.length !== 11) {
        return "Informe um telefone válido, incluindo o DDD.";
    }

    if (!Number.isFinite(d.area) || d.area <= 0) {
        return "Informe uma área válida.";
    }

    if (!d.prazo) {
        return "Selecione o prazo desejado.";
    }

    const servicosSelecionados = obterServicos();

    if (servicosSelecionados.length === 0) {
        return "Selecione pelo menos um serviço.";
    }

    if (
        servicosSelecionados.includes("Outro") &&
        !d.outroDescricao
    ) {
        return "Descreva o serviço selecionado em 'Outro'.";
    }

    if (somenteNumeros(d.cep).length !== 8) {
        return "Informe um CEP válido.";
    }

    if (
        !d.estado ||
        !d.cidade ||
        !d.bairro ||
        !d.logradouro ||
        !d.numero
    ) {
        return "Preencha todos os campos obrigatórios do endereço.";
    }

    return null;
}

// ============================================================
// GERAR PDF
// ============================================================

function gerarPDF(d, codigoOrcamento) {
    if (!window.jspdf?.jsPDF) {
        throw new Error(
            "A biblioteca jsPDF não foi carregada. Confira o HTML."
        );
    }

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        unit: "mm",
        format: "a4"
    });

    const margem = 18;
    const largura = 174;

    let y = 20;

    function verificarNovaPagina(altura) {
        if (y + altura > 280) {
            pdf.addPage();
            y = 20;
        }
    }

    function titulo(texto) {
        verificarNovaPagina(14);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);

        pdf.text(texto, margem, y);

        y += 7;

        pdf.setDrawColor(180);
        pdf.line(margem, y, margem + largura, y);

        y += 5;
    }

    function textoRotulado(rotulo, valor) {
        const texto = `${rotulo}: ${valor || "-"}`;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        const linhas = pdf.splitTextToSize(texto, largura);
        const altura = linhas.length * 5;

        verificarNovaPagina(altura);

        pdf.text(linhas, margem, y);

        y += altura + 1;
    }

    // --------------------------------------------------------
    // CABEÇALHO
    // --------------------------------------------------------

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);

    pdf.text(
        "Sabino Gesso",
        margem,
        y
    );

    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);

    pdf.text(
        "Solicitação de orçamento - Pessoa Jurídica",
        margem,
        y
    );

    y += 8;

    textoRotulado(
        "Data da solicitação",
        new Date().toLocaleDateString("pt-BR")
    );

    if (codigoOrcamento) {
        textoRotulado(
            "Código do orçamento",
            codigoOrcamento
        );
    }

    y += 3;

    // --------------------------------------------------------
    // DADOS DA EMPRESA
    // --------------------------------------------------------

    titulo("DADOS DA EMPRESA");

    textoRotulado("Razão social", d.razaoSocial);
    textoRotulado("Nome fantasia", d.nomeFantasia);
    textoRotulado("CNPJ", d.cnpj);
    textoRotulado("Responsável", d.responsavel);
    textoRotulado("E-mail", d.email);
    textoRotulado("Telefone", d.telefone);

    y += 3;

    // --------------------------------------------------------
    // DADOS DO SERVIÇO
    // --------------------------------------------------------

    titulo("SERVIÇOS SOLICITADOS");

    const listaServicos = [
        ...d.servicos,
        ...(d.outroDescricao
            ? [`Outro: ${d.outroDescricao}`]
            : [])
    ];

    textoRotulado("Serviços", listaServicos.join(", "));
    textoRotulado("Área aproximada", `${d.area} m²`);
    textoRotulado("Prazo desejado", d.prazo);

    y += 3;

    // --------------------------------------------------------
    // ENDEREÇO
    // --------------------------------------------------------

    titulo("ENDEREÇO DA EMPRESA");

    textoRotulado("CEP", d.cep);
    textoRotulado("Estado", d.estadoTexto || d.estado);
    textoRotulado("Cidade", d.cidade);
    textoRotulado("Bairro", d.bairro);
    textoRotulado("Logradouro", d.logradouro);
    textoRotulado("Número", d.numero);
    textoRotulado("Complemento", d.complemento);

    // --------------------------------------------------------
    // SALVAR PDF
    // --------------------------------------------------------

    const nomeSeguro = d.razaoSocial
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "empresa";

    const codigoSeguro = codigoOrcamento
        ? "-" + String(codigoOrcamento)
            .replace(/[^a-zA-Z0-9_-]/g, "")
        : "";

    pdf.save(
        `orcamento-${nomeSeguro}${codigoSeguro}.pdf`
    );
}

// ============================================================
// ENVIAR AO BANCO E GERAR PDF
// ============================================================

async function gerarPDFEEnviar(event) {
    event.preventDefault();

    if (envioEmAndamento) return;

    const formulario = obterCampo("formOrcamentoPJ");

    if (!formulario) {
        alert("O formulário não foi encontrado.");
        return;
    }

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const dados = obterDadosFormulario();
    const erroValidacao = validarDados(dados);

    if (erroValidacao) {
        alert(erroValidacao);
        return;
    }

    const botaoSubmit = formulario.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    const botaoGerarPDF = obterCampo("btnGerarPDF");

    const textoOriginal = botaoSubmit
        ? botaoSubmit.textContent
        : "";

    envioEmAndamento = true;

    if (botaoSubmit) {
        botaoSubmit.disabled = true;
        botaoSubmit.textContent = "Enviando...";
    }

    if (botaoGerarPDF) {
        botaoGerarPDF.setAttribute("aria-disabled", "true");
    }

    try {
        // 1. Salvar o orçamento no banco por meio da rota POST.
        // Esta função não executa DELETE nem apaga registros anteriores.

        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                resultado.mensagem ||
                `Falha ao salvar o orçamento (HTTP ${resposta.status}).`
            );
        }

        // 2. Gerar o PDF depois da confirmação de salvamento.
        const codigoOrcamento =
            resultado.codigo ??
            resultado.codigoOrcamento ??
            resultado.id ??
            null;

        try {
            gerarPDF(dados, codigoOrcamento);

            alert(
                "Orçamento salvo no banco e PDF gerado com sucesso." +
                (
                    codigoOrcamento
                        ? `\nCódigo: ${codigoOrcamento}`
                        : ""
                )
            );

        } catch (erroPDF) {
            console.error("Erro ao gerar PDF:", erroPDF);

            alert(
                "O orçamento foi salvo no banco, mas não foi possível gerar o PDF.\n\n" +
                erroPDF.message
            );
        }

    } catch (erro) {
        console.error("Erro ao enviar orçamento:", erro);

        alert(
            "Não foi possível confirmar o salvamento do orçamento.\n" +
            "Verifique se o servidor e o banco estão funcionando.\n\n" +
            erro.message
        );

    } finally {
        envioEmAndamento = false;

        if (botaoSubmit) {
            botaoSubmit.disabled = false;
            botaoSubmit.textContent = textoOriginal;
        }

        if (botaoGerarPDF) {
            botaoGerarPDF.removeAttribute("aria-disabled");
        }
    }
}

// ============================================================
// ENVIAR PELO WHATSAPP
// ============================================================

function enviarWhatsApp(event) {
    event.preventDefault();

    const formulario = obterCampo("formOrcamentoPJ");

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const dados = obterDadosFormulario();
    const erro = validarDados(dados);

    if (erro) {
        alert(erro);
        return;
    }

    const listaServicos = [
        ...dados.servicos,
        ...(dados.outroDescricao
            ? [`Outro: ${dados.outroDescricao}`]
            : [])
    ];

    const mensagem = `
Olá! Gostaria de solicitar um orçamento.

*DADOS DA EMPRESA*
Razão Social: ${dados.razaoSocial}
Nome Fantasia: ${dados.nomeFantasia}
CNPJ: ${dados.cnpj}
E-mail: ${dados.email}
Telefone: ${dados.telefone}
Responsável: ${dados.responsavel}

*SERVIÇOS*
${listaServicos.map(item => `• ${item}`).join("\n")}

Área aproximada: ${dados.area} m²
Prazo desejado: ${dados.prazo}

*ENDEREÇO*
CEP: ${dados.cep}
Estado: ${dados.estadoTexto}
Cidade: ${dados.cidade}
Bairro: ${dados.bairro}
Logradouro: ${dados.logradouro}
Número: ${dados.numero}
Complemento: ${dados.complemento}
`.trim();

    const url =
        `https://wa.me/${NUMERO_WHATSAPP_EMPRESA}` +
        `?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank", "noopener,noreferrer");
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    const cnpj = obterCampo("cnpj");
    const telefone = obterCampo("telefone");
    const cep = obterCampo("cep");
    const estado = obterCampo("estado");
    const outro = obterCampo("servicoOutro");
    const outroTexto = obterCampo("servicoOutroTexto");
    const formulario = obterCampo("formOrcamentoPJ");
    const botaoWhatsApp = obterCampo("btnWhatsApp");
    const botaoGerarPDF = obterCampo("btnGerarPDF");

    estadosCarregamento = carregarEstados();

    // CNPJ
    cnpj?.addEventListener("input", () => {
        cnpj.value = aplicarMascaraCNPJ(cnpj.value);
    });

    // Telefone
    telefone?.addEventListener("input", () => {
        telefone.value = aplicarMascaraTelefone(telefone.value);
    });

    // CEP: consulta quando os oito dígitos forem digitados.
    cep?.addEventListener("input", () => {
        cep.value = aplicarMascaraCEP(cep.value);

        const numeros = somenteNumeros(cep.value);

        if (numeros.length === 8) {
            buscarCEP();
        } else {
            // Invalida uma consulta anterior se o CEP for alterado.
            ++consultaCEPAtual;
            ultimoCEPConsultado = "";
            cepEmConsulta = "";

            mostrarStatusCep("", "info");
        }
    });

    // Também consulta quando o usuário sai do campo.
    cep?.addEventListener("blur", () => {
        if (somenteNumeros(cep.value).length === 8) {
            buscarCEP();
        }
    });

    // Se o usuário trocar manualmente o estado, recarrega as cidades.
    estado?.addEventListener("change", () => {
        carregarCidades(estado.value);
    });

    // Campo "Outro" serviço.
    function atualizarCampoOutro() {
        if (!outro || !outroTexto) return;

        outroTexto.disabled = !outro.checked;
        outroTexto.required = outro.checked;

        if (!outro.checked) {
            outroTexto.value = "";
        }
    }

    outro?.addEventListener("change", atualizarCampoOutro);
    atualizarCampoOutro();

    // Envia para o banco e gera o PDF.
    formulario?.addEventListener("submit", gerarPDFEEnviar);

    // O ícone de PDF inicia o mesmo processo de envio e geração.
    botaoGerarPDF?.addEventListener("click", event => {
        event.preventDefault();

        if (envioEmAndamento) return;

        formulario?.requestSubmit();
    });

    // WhatsApp.
    botaoWhatsApp?.addEventListener("click", enviarWhatsApp);
});
