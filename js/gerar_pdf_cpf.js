// ============================================================
// CONFIGURAÇÕES
// ============================================================

// URL da API:
// - Se a página definir window.API_URL antes deste script, usa ela.
// - Em desenvolvimento (localhost / arquivo local): servidor na porta 3000.
// - Em produção: caminho relativo "/api" (mesmo domínio do site).
const API_URL = (function () {
    if (window.API_URL) return window.API_URL;

    const host = window.location.hostname;
    const local =
        window.location.protocol === "file:" ||
        host === "localhost" ||
        host === "127.0.0.1";

    return local ? "http://localhost:3000/api" : "/api";
})();

// TROQUE pelo número real da empresa (DDI + DDD + número, só dígitos).
const NUMERO_WHATSAPP_EMPRESA = "5511999999999";

const TEXTO_CIDADE_PADRAO = "Selecione a cidade";

const cacheCEP = new Map();

let ultimoCEPConsultado = "";
let consultaCEPEmAndamento = false;


// ============================================================
// MÁSCARAS
// ============================================================

function aplicarMascaraCPF(valor) {
    valor = valor.replace(/\D/g, "").substring(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return valor;
}

function aplicarMascaraTelefone(valor) {
    valor = valor.replace(/\D/g, "").substring(0, 11);
    valor = valor.replace(/^(\d{2})(\d)/, "($1) $2");

    if (valor.replace(/\D/g, "").length <= 10) {
        valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
    }

    return valor;
}

function aplicarMascaraCEP(valor) {
    valor = valor.replace(/\D/g, "").substring(0, 8);

    if (valor.length > 5) {
        valor = valor.substring(0, 5) + "-" + valor.substring(5);
    }

    return valor;
}


// ============================================================
// VALIDAÇÕES
// ============================================================

function validarCPF(cpf) {
    const numeros = cpf.replace(/\D/g, "");

    if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) {
        return false;
    }

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(numeros.charAt(i)) * (10 - i);
    }

    let resto = soma % 11;
    const primeiroDigito = resto < 2 ? 0 : 11 - resto;

    if (primeiroDigito !== Number(numeros.charAt(9))) {
        return false;
    }

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(numeros.charAt(i)) * (11 - i);
    }

    resto = soma % 11;
    const segundoDigito = resto < 2 ? 0 : 11 - resto;

    return segundoDigito === Number(numeros.charAt(10));
}

// DDD entre 11 e 99; celular (11 dígitos) deve começar com 9.
// Mesma regra aplicada no servidor.
function validarTelefone(telefone) {
    const numeros = telefone.replace(/\D/g, "");

    if (numeros.length !== 10 && numeros.length !== 11) {
        return false;
    }

    if (!/^[1-9][1-9]/.test(numeros)) {
        return false;
    }

    if (numeros.length === 11) {
        return numeros.charAt(2) === "9";
    }

    return /^[2-9]/.test(numeros.charAt(2));
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizarTexto(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function falha(mensagem, campo) {
    alert(mensagem);

    if (campo) {
        campo.focus();
    }

    return null;
}


// ============================================================
// ESTADOS E CIDADES
// ============================================================

async function carregarEstados() {
    const estado = document.getElementById("estado");

    if (!estado) return;

    try {
        const resposta = await fetch(
            "https://brasilapi.com.br/api/ibge/uf/v1"
        );

        if (!resposta.ok) {
            throw new Error("Erro ao carregar estados.");
        }

        const estados = await resposta.json();

        estado.innerHTML =
            '<option value="">Selecione o estado</option>';

        estados
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .forEach(item => {
                const option = document.createElement("option");
                option.value = item.sigla;
                option.textContent = `${item.nome} - ${item.sigla}`;
                estado.appendChild(option);
            });

    } catch (erro) {
        console.error("Erro ao carregar estados:", erro);

        estado.innerHTML =
            '<option value="">Erro ao carregar estados</option>';
    }
}

async function selecionarEstado() {
    const estado = document.getElementById("estado");
    const cidade = document.getElementById("cidade");

    if (!estado || !cidade) return;

    const uf = estado.value;

    if (!uf) {
        cidade.innerHTML =
            `<option value="">${TEXTO_CIDADE_PADRAO}</option>`;

        cidade.disabled = true;
        return;
    }

    cidade.disabled = true;
    cidade.innerHTML =
        '<option value="">Carregando cidades...</option>';

    await carregarCidades(uf);
}

async function carregarCidades(uf) {
    const cidade = document.getElementById("cidade");

    if (!cidade) return;

    try {
        const resposta = await fetch(
            `https://brasilapi.com.br/api/ibge/municipios/v1/${uf}?providers=dados-abertos-br,gov,wikipedia`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao carregar cidades.");
        }

        const cidades = await resposta.json();

        cidade.innerHTML =
            `<option value="">${TEXTO_CIDADE_PADRAO}</option>`;

        cidades
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .forEach(item => {
                const option = document.createElement("option");
                option.value = item.nome;
                option.textContent = item.nome;
                cidade.appendChild(option);
            });

        cidade.disabled = false;

    } catch (erro) {
        console.error("Erro ao carregar cidades:", erro);

        cidade.innerHTML =
            '<option value="">Erro ao carregar cidades</option>';

        cidade.disabled = true;
    }
}

function selecionarCidadePorNome(nome) {
    const cidade = document.getElementById("cidade");

    if (!cidade || !nome) return;

    const alvo = normalizarTexto(nome);

    const opcao = Array.from(cidade.options).find(
        item => normalizarTexto(item.value) === alvo
    );

    if (opcao) {
        cidade.value = opcao.value;
        return;
    }

    const nova = document.createElement("option");
    nova.value = nome;
    nova.textContent = nome;

    cidade.appendChild(nova);
    cidade.value = nome;
}


// ============================================================
// BUSCAR ENDEREÇO PELO CEP — SEM REPETIÇÃO
// ============================================================

async function buscarCEP() {
    const campoCEP = document.getElementById("cep");

    if (!campoCEP) return;

    const cep = campoCEP.value.replace(/\D/g, "");

    // Não consulta CEP incompleto
    if (cep.length !== 8) return;

    // Evita repetir consulta ou alerta para o mesmo CEP
    if (ultimoCEPConsultado === cep) return;

    // Evita consultas simultâneas
    if (consultaCEPEmAndamento) return;

    ultimoCEPConsultado = cep;
    consultaCEPEmAndamento = true;

    try {
        let dados;

        // Usa o cache, inclusive para CEPs inexistentes
        if (cacheCEP.has(cep)) {
            dados = cacheCEP.get(cep);
        } else {
            const resposta = await fetch(
                `https://viacep.com.br/ws/${cep}/json/`
            );

            if (!resposta.ok) {
                throw new Error("Falha na consulta do CEP.");
            }

            dados = await resposta.json();
            cacheCEP.set(cep, dados);
        }

        // CEP inexistente: alerta uma única vez por CEP
        if (dados.erro) {
            alert(
                "O CEP informado não foi encontrado. " +
                "Confira os números e tente novamente."
            );

            // setTimeout evita conflito com o blur disparado pelo alert
            setTimeout(function () {
                campoCEP.focus();
            }, 0);

            return;
        }

        // Preenche o bairro
        const bairro = document.getElementById("bairro");

        if (bairro) {
            bairro.value = dados.bairro || "";
        }

        // Preenche o logradouro
        const logradouro = document.getElementById("logradouro");

        if (logradouro) {
            logradouro.value = dados.logradouro || "";
        }

        // Seleciona o estado e carrega as cidades
        const estado = document.getElementById("estado");

        if (estado && dados.uf) {
            estado.value = dados.uf;
            await carregarCidades(dados.uf);
        }

        // Seleciona a cidade ignorando acentos e maiúsculas
        const cidade = document.getElementById("cidade");

        if (cidade && dados.localidade) {
            selecionarCidadePorNome(dados.localidade);
            cidade.disabled = false;
        }

        // Foco no número após preencher o endereço
        const numero = document.getElementById("numero");

        if (numero) {
            numero.focus();
        }

    } catch (erro) {
        // Libera nova tentativa com o mesmo CEP após falha de rede
        ultimoCEPConsultado = "";

        alert(
            "Não foi possível consultar o CEP neste momento. " +
            "Preencha o endereço manualmente ou tente novamente."
        );

    } finally {
        consultaCEPEmAndamento = false;
    }
}


// ============================================================
// SERVIÇOS
// ============================================================

function obterServicosSelecionados() {
    return Array.from(
        document.querySelectorAll('input[name="servicos"]:checked')
    ).map(item => item.value);
}

function formatarServicos(dados) {
    return dados.servicos.map(function (servico) {
        return servico === "Outro" && dados.outroDescricao
            ? `Outro: ${dados.outroDescricao}`
            : servico;
    });
}


// ============================================================
// VALIDAR DADOS DO FORMULÁRIO
// ============================================================

function validarDadosFormulario() {
    const el = id => document.getElementById(id);

    if (!el("formOrcamentoPF")) {
        return falha("Formulário não encontrado.");
    }

    const nome = el("nome");
    const campoCPF = el("cpf");
    const email = el("email");
    const telefone = el("telefone");
    const area = el("area");
    const cep = el("cep");
    const estado = el("estado");
    const cidade = el("cidade");
    const bairro = el("bairro");
    const logradouro = el("logradouro");
    const numero = el("numero");
    const outroTexto = el("servicoOutroTexto");

    if (!nome.value.trim()) {
        return falha("Informe seu nome.", nome);
    }

    if (!campoCPF.value.trim()) {
        return falha("Informe o CPF.", campoCPF);
    }

    if (!validarCPF(campoCPF.value)) {
        return falha("Informe um CPF válido.", campoCPF);
    }

    if (!email.value.trim()) {
        return falha("Informe o e-mail.", email);
    }

    if (!validarEmail(email.value)) {
        return falha("Informe um e-mail válido.", email);
    }

    if (!telefone.value.trim()) {
        return falha("Informe o telefone.", telefone);
    }

    if (!validarTelefone(telefone.value)) {
        return falha(
            "Informe um telefone válido, com DDD. " +
            "Celulares começam com 9 após o DDD.",
            telefone
        );
    }

    if (!area.value || Number(area.value) <= 0) {
        return falha("Informe uma área válida.", area);
    }

    if (!cep.value.trim()) {
        return falha("Informe o CEP.", cep);
    }

    if (cep.value.replace(/\D/g, "").length !== 8) {
        return falha("Informe um CEP válido com oito dígitos.", cep);
    }

    if (!estado.value) {
        return falha("Informe o estado.", estado);
    }

    if (!cidade.value) {
        return falha("Informe a cidade.", cidade);
    }

    if (!bairro.value.trim()) {
        return falha("Informe o bairro.", bairro);
    }

    if (!logradouro.value.trim()) {
        return falha("Informe o logradouro.", logradouro);
    }

    if (!numero.value.trim()) {
        return falha("Informe o número.", numero);
    }

    const servicos = obterServicosSelecionados();

    if (servicos.length === 0) {
        return falha("Selecione pelo menos um serviço.");
    }

    const outroDescricao = outroTexto
        ? outroTexto.value.trim()
        : "";

    if (servicos.includes("Outro") && !outroDescricao) {
        return falha("Descreva o outro serviço.", outroTexto);
    }

    const prazoSelecionado = document.querySelector(
        'input[name="prazo"]:checked'
    );

    if (!prazoSelecionado) {
        return falha("Selecione o prazo desejado.");
    }

    return {
        nome: nome.value.trim(),
        cpf: campoCPF.value.trim(),
        email: email.value.trim(),
        telefone: telefone.value.trim(),
        area: Number(area.value),
        cep: cep.value.trim(),
        estado: estado.value,
        cidade: cidade.value,
        bairro: bairro.value.trim(),
        logradouro: logradouro.value.trim(),
        numero: numero.value.trim(),
        complemento: (el("complemento")?.value || "").trim(),
        servicos: servicos,
        outroDescricao: servicos.includes("Outro") ? outroDescricao : "",
        prazo: prazoSelecionado.value
    };
}


// ============================================================
// ENVIAR PARA O BANCO
// ============================================================

async function enviarOrcamento(dados) {
    const resposta = await fetch(`${API_URL}/orcamentos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    });

    const textoResposta = await resposta.text();

    let corpo = {};

    try {
        corpo = JSON.parse(textoResposta);
    } catch (erro) {
        // Resposta que não é JSON
    }

    if (!resposta.ok) {
        throw new Error(
            corpo.erro ||
            `Não foi possível enviar o orçamento (erro ${resposta.status}).`
        );
    }

    return corpo;
}


// ============================================================
// LIMPAR FORMULÁRIO
// ============================================================

function limparFormulario() {
    const form = document.getElementById("formOrcamentoPF");
    const cidade = document.getElementById("cidade");
    const outroTexto = document.getElementById("servicoOutroTexto");

    if (form) {
        form.reset();
    }

    if (cidade) {
        cidade.innerHTML =
            `<option value="">${TEXTO_CIDADE_PADRAO}</option>`;
        cidade.disabled = true;
    }

    if (outroTexto) {
        outroTexto.disabled = true;
    }

    ultimoCEPConsultado = "";
    consultaCEPEmAndamento = false;
}


// ============================================================
// GERAR PDF
// ============================================================

function gerarPDF(dadosFormulario = null) {
    const dados = dadosFormulario || validarDadosFormulario();

    if (!dados) return;

    if (typeof window.jspdf === "undefined") {
        alert("Não foi possível carregar o gerador de PDF.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 20;

    function linha(texto, tamanho = 11, espaco = 2) {
        doc.setFontSize(tamanho);

        const partes = doc.splitTextToSize(texto, 170);

        if (y + partes.length * 6 > 280) {
            doc.addPage();
            y = 20;
        }

        doc.text(partes, 20, y);
        y += partes.length * 6 + espaco;
    }

    linha("Solicitação de Orçamento", 18, 8);
    linha(`Nome: ${dados.nome}`);
    linha(`CPF: ${dados.cpf}`);
    linha(`E-mail: ${dados.email}`);
    linha(`Telefone: ${dados.telefone}`);
    linha(`Área aproximada: ${dados.area} m²`, 11, 8);

    linha("Endereço", 13, 4);
    linha(`CEP: ${dados.cep}`);
    linha(`Estado: ${dados.estado}`);
    linha(`Cidade: ${dados.cidade}`);
    linha(`Bairro: ${dados.bairro}`);
    linha(`Logradouro: ${dados.logradouro}`);
    linha(`Número: ${dados.numero}`);

    if (dados.complemento) {
        linha(`Complemento: ${dados.complemento}`);
    }

    y += 4;
    linha("Serviços solicitados", 13, 4);

    formatarServicos(dados).forEach(function (servico) {
        linha(`- ${servico}`);
    });

    y += 4;
    linha(`Prazo desejado: ${dados.prazo}`);

    doc.save("solicitacao-orcamento.pdf");
}


// ============================================================
// ENVIAR PARA WHATSAPP
// ============================================================

function enviarWhatsApp() {
    const dados = validarDadosFormulario();

    if (!dados) return;

    // Proteção contra publicar com o número fictício
    if (NUMERO_WHATSAPP_EMPRESA === "5511999999999") {
        alert(
            "O número de WhatsApp da empresa ainda não foi configurado."
        );
        return;
    }

    const linhas = [
        "Olá! Gostaria de solicitar um orçamento.",
        "",
        `*Nome:* ${dados.nome}`,
        `*CPF:* ${dados.cpf}`,
        `*E-mail:* ${dados.email}`,
        `*Telefone:* ${dados.telefone}`,
        `*Área aproximada:* ${dados.area} m²`,
        "",
        "*Endereço:*",
        `CEP: ${dados.cep}`,
        `Estado: ${dados.estado}`,
        `Cidade: ${dados.cidade}`,
        `Bairro: ${dados.bairro}`,
        `Logradouro: ${dados.logradouro}`,
        `Número: ${dados.numero}`
    ];

    if (dados.complemento) {
        linhas.push(`Complemento: ${dados.complemento}`);
    }

    linhas.push("", "*Serviços solicitados:*");

    formatarServicos(dados).forEach(function (servico) {
        linhas.push(`- ${servico}`);
    });

    linhas.push("", `*Prazo desejado:* ${dados.prazo}`);

    const mensagem = encodeURIComponent(linhas.join("\n"));

    window.open(
        `https://wa.me/${NUMERO_WHATSAPP_EMPRESA}?text=${mensagem}`,
        "_blank",
        "noopener"
    );
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formOrcamentoPF");
    const campoCPF = document.getElementById("cpf");
    const campoTelefone = document.getElementById("telefone");
    const campoCEP = document.getElementById("cep");
    const estado = document.getElementById("estado");
    const servicoOutro = document.getElementById("servicoOutro");
    const servicoOutroTexto = document.getElementById("servicoOutroTexto");
    const btnWhatsApp = document.getElementById("btnWhatsApp");
    const btnGerarPDF = document.getElementById("btnGerarPDF");

    carregarEstados();

    // --------------------------------------------------------
    // MÁSCARAS
    // --------------------------------------------------------

    if (campoCPF) {
        campoCPF.addEventListener("input", function () {
            this.value = aplicarMascaraCPF(this.value);
        });
    }

    if (campoTelefone) {
        campoTelefone.addEventListener("input", function () {
            this.value = aplicarMascaraTelefone(this.value);
        });
    }

    // --------------------------------------------------------
    // CEP: MÁSCARA + CONSULTA SEM DUPLICAÇÃO
    // --------------------------------------------------------

    if (campoCEP) {
        campoCEP.addEventListener("input", function () {
            this.value = aplicarMascaraCEP(this.value);

            const digitos = this.value.replace(/\D/g, "");

            // Se o CEP mudou, libera uma nova consulta.
            if (digitos !== ultimoCEPConsultado) {
                ultimoCEPConsultado = "";
            }

            if (digitos.length === 8) {
                buscarCEP();
            }
        });

        campoCEP.addEventListener("blur", function () {
            buscarCEP();
        });
    }

    // --------------------------------------------------------
    // ESTADO -> CIDADES
    // --------------------------------------------------------

    if (estado) {
        estado.addEventListener("change", selecionarEstado);
    }

    // --------------------------------------------------------
    // SERVIÇO "OUTRO"
    // --------------------------------------------------------

    if (servicoOutro && servicoOutroTexto) {
        servicoOutro.addEventListener("change", function () {
            servicoOutroTexto.disabled = !this.checked;

            if (this.checked) {
                servicoOutroTexto.focus();
            } else {
                servicoOutroTexto.value = "";
            }
        });
    }

    // --------------------------------------------------------
    // ENVIO DO FORMULÁRIO
    // --------------------------------------------------------

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const dados = validarDadosFormulario();

            if (!dados) return;

            const botao = form.querySelector('button[type="submit"]');
            const textoOriginal = botao ? botao.textContent : "";

            if (botao) {
                botao.disabled = true;
                botao.textContent = "Enviando...";
            }

            try {
                const resultado = await enviarOrcamento(dados);

                gerarPDF(dados);

                alert(
                    `Orçamento enviado com sucesso!\n` +
                    `Código: ${resultado.codigo}\n\n` +
                    `O PDF também foi gerado.`
                );

                limparFormulario();

            } catch (erro) {
                alert(
                    erro.message ||
                    "Não foi possível enviar o orçamento. " +
                    "Verifique se o servidor está funcionando."
                );

            } finally {
                if (botao) {
                    botao.disabled = false;
                    botao.textContent = textoOriginal;
                }
            }
        });
    }

    // --------------------------------------------------------
    // BOTÃO WHATSAPP
    // --------------------------------------------------------

    if (btnWhatsApp) {
        btnWhatsApp.addEventListener("click", function (event) {
            event.preventDefault();
            enviarWhatsApp();
        });
    }

    // --------------------------------------------------------
    // BOTÃO GERAR PDF
    // --------------------------------------------------------

    if (btnGerarPDF) {
        btnGerarPDF.addEventListener("click", function (event) {
            event.preventDefault();
            gerarPDF();
        });
    }
});