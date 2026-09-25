// ============================================================
// CONFIGURAÇÕES
// ============================================================

const NUMERO_WHATSAPP_EMPRESA = "5511999999999";

let ultimoCEPConsultado = "";


// ============================================================
// MÁSCARA DE CPF
// ============================================================

function aplicarMascaraCPF(valor) {

    valor = valor.replace(/\D/g, "");

    if (valor.length > 11) {
        valor = valor.substring(0, 11);
    }

    valor = valor.replace(
        /(\d{3})(\d)/,
        "$1.$2"
    );

    valor = valor.replace(
        /(\d{3})(\d)/,
        "$1.$2"
    );

    valor = valor.replace(
        /(\d{3})(\d{1,2})$/,
        "$1-$2"
    );

    return valor;
}


// ============================================================
// MÁSCARA DE TELEFONE
// ============================================================

function aplicarMascaraTelefone(valor) {

    valor = valor.replace(/\D/g, "");

    if (valor.length > 11) {
        valor = valor.substring(0, 11);
    }

    if (valor.length <= 10) {

        valor = valor.replace(
            /^(\d{2})(\d)/,
            "($1) $2"
        );

        valor = valor.replace(
            /(\d{4})(\d)/,
            "$1-$2"
        );

    } else {

        valor = valor.replace(
            /^(\d{2})(\d)/,
            "($1) $2"
        );

        valor = valor.replace(
            /(\d{5})(\d)/,
            "$1-$2"
        );
    }

    return valor;
}


// ============================================================
// MÁSCARA DE CEP
// ============================================================

function aplicarMascaraCEP(valor) {

    valor = valor.replace(/\D/g, "");

    if (valor.length > 8) {
        valor = valor.substring(0, 8);
    }

    if (valor.length > 5) {

        valor =
            valor.substring(0, 5) +
            "-" +
            valor.substring(5);

    }

    return valor;
}


// ============================================================
// VALIDAÇÃO DO CPF
// ============================================================

function validarCPF(cpf) {

    const numeros =
        cpf.replace(/\D/g, "");

    // CPF precisa ter exatamente 11 números
    if (numeros.length !== 11) {
        return false;
    }

    // Impede CPFs como 00000000000, 11111111111 etc.
    if (/^(\d)\1{10}$/.test(numeros)) {
        return false;
    }


    // ========================================================
    // PRIMEIRO DÍGITO
    // ========================================================

    let soma = 0;

    for (let i = 0; i < 9; i++) {

        soma +=
            Number(numeros.charAt(i)) *
            (10 - i);
    }

    let resto = soma % 11;

    let primeiroDigito =
        resto < 2
            ? 0
            : 11 - resto;


    if (
        primeiroDigito !==
        Number(numeros.charAt(9))
    ) {

        return false;
    }


    // ========================================================
    // SEGUNDO DÍGITO
    // ========================================================

    soma = 0;

    for (let i = 0; i < 10; i++) {

        soma +=
            Number(numeros.charAt(i)) *
            (11 - i);
    }

    resto = soma % 11;

    let segundoDigito =
        resto < 2
            ? 0
            : 11 - resto;


    if (
        segundoDigito !==
        Number(numeros.charAt(10))
    ) {

        return false;
    }

    return true;
}


// ============================================================
// VALIDAÇÃO DO TELEFONE
// ============================================================

function validarTelefone(telefone) {

    const numeros =
        telefone.replace(/\D/g, "");

    return (
        numeros.length === 10 ||
        numeros.length === 11
    );
}


// ============================================================
// VALIDAÇÃO DO E-MAIL
// ============================================================

function validarEmail(email) {

    const regex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);
}


// ============================================================
// CARREGAR ESTADOS
// ============================================================

async function carregarEstados() {

    const estado =
        document.getElementById("estado");

    if (!estado) {
        return;
    }

    try {

        const resposta =
            await fetch(
                "https://brasilapi.com.br/api/ibge/uf/v1"
            );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao carregar estados."
            );
        }

        const estados =
            await resposta.json();

        estado.innerHTML =
            '<option value="">Selecione o estado</option>';

        estados
            .sort((a, b) =>
                a.nome.localeCompare(b.nome)
            )
            .forEach(item => {

                const option =
                    document.createElement("option");

                option.value =
                    item.sigla;

                option.textContent =
                    `${item.nome} - ${item.sigla}`;

                estado.appendChild(option);
            });

    } catch (erro) {

        console.error(
            "Erro ao carregar estados:",
            erro
        );

        estado.innerHTML =
            '<option value="">Erro ao carregar estados</option>';
    }
}


// ============================================================
// SELECIONAR ESTADO
// ============================================================

async function selecionarEstado() {

    const estado =
        document.getElementById("estado");

    const cidade =
        document.getElementById("cidade");

    if (!estado || !cidade) {
        return;
    }

    const uf =
        estado.value;

    cidade.innerHTML =
        '<option value="">Carregando cidades...</option>';

    if (!uf) {

        cidade.innerHTML =
            '<option value="">Selecione a cidade</option>';

        return;
    }

    await carregarCidades(uf);
}


// ============================================================
// CARREGAR CIDADES
// ============================================================

async function carregarCidades(uf) {

    const cidade =
        document.getElementById("cidade");

    if (!cidade) {
        return;
    }

    try {

        const resposta =
            await fetch(
                `https://brasilapi.com.br/api/ibge/municipios/v1/${uf}?providers=dados-abertos-br,gov,wikipedia`
            );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao carregar cidades."
            );
        }

        const cidades =
            await resposta.json();

        cidade.innerHTML =
            '<option value="">Selecione a cidade</option>';

        cidades
            .sort((a, b) =>
                a.nome.localeCompare(b.nome)
            )
            .forEach(item => {

                const option =
                    document.createElement("option");

                option.value =
                    item.nome;

                option.textContent =
                    item.nome;

                cidade.appendChild(option);
            });

    } catch (erro) {

        console.error(
            "Erro ao carregar cidades:",
            erro
        );

        cidade.innerHTML =
            '<option value="">Erro ao carregar cidades</option>';
    }
}


// ============================================================
// LIMPAR ENDEREÇO
// ============================================================

function limparEndereco() {

    const campos = [
        "estado",
        "cidade",
        "bairro",
        "logradouro"
    ];

    campos.forEach(id => {

        const campo =
            document.getElementById(id);

        if (campo) {

            if (
                campo.tagName === "SELECT"
            ) {

                campo.selectedIndex = 0;

            } else {

                campo.value = "";
            }
        }
    });
}


// ============================================================
// BUSCAR CEP
// ============================================================

async function buscarCEP() {

    const campoCEP =
        document.getElementById("cep");

    if (!campoCEP) {
        return;
    }

    const cep =
        campoCEP.value.replace(/\D/g, "");

    if (cep.length !== 8) {
        return;
    }

    if (
        ultimoCEPConsultado === cep
    ) {
        return;
    }

    ultimoCEPConsultado = cep;

    try {

        const resposta =
            await fetch(
                `https://viacep.com.br/ws/${cep}/json/`
            );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao consultar CEP."
            );
        }

        const dados =
            await resposta.json();

        if (dados.erro) {

            alert(
                "CEP não encontrado."
            );

            ultimoCEPConsultado = "";

            return;
        }


        // ====================================================
        // PREENCHER ENDEREÇO
        // ====================================================

        const bairro =
            document.getElementById("bairro");

        const logradouro =
            document.getElementById("logradouro");

        if (bairro) {
            bairro.value =
                dados.bairro || "";
        }

        if (logradouro) {
            logradouro.value =
                dados.logradouro || "";
        }


        // ====================================================
        // ESTADO
        // ====================================================

        const estado =
            document.getElementById("estado");

        if (estado && dados.uf) {

            estado.value =
                dados.uf;

            await carregarCidades(
                dados.uf
            );
        }


        // ====================================================
        // CIDADE
        // ====================================================

        const cidade =
            document.getElementById("cidade");

        if (cidade && dados.localidade) {

            cidade.value =
                dados.localidade;
        }

    } catch (erro) {

        console.error(
            "Erro ao consultar CEP:",
            erro
        );

        alert(
            "Não foi possível consultar o CEP."
        );

        ultimoCEPConsultado = "";
    }
}


// ============================================================
// OBTER SERVIÇOS
// ============================================================

function obterServicos() {

    const servicos = [];

    const servicoSanca =
        document.getElementById("servicoSanca");

    const servicoForro =
        document.getElementById("servicoForro");

    const servicoMoldura =
        document.getElementById("servicoMoldura");

    const servicoDivisoria =
        document.getElementById("servicoDivisoria");

    const servicoOutro =
        document.getElementById("servicoOutro");

    const servicoOutroTexto =
        document.getElementById("servicoOutroTexto");


    if (
        servicoSanca &&
        servicoSanca.checked
    ) {

        servicos.push(
            "Sanca"
        );
    }


    if (
        servicoForro &&
        servicoForro.checked
    ) {

        servicos.push(
            "Forro"
        );
    }


    if (
        servicoMoldura &&
        servicoMoldura.checked
    ) {

        servicos.push(
            "Moldura"
        );
    }


    if (
        servicoDivisoria &&
        servicoDivisoria.checked
    ) {

        servicos.push(
            "Divisória"
        );
    }


    if (
        servicoOutro &&
        servicoOutro.checked
    ) {

        let outro =
            "Outro";

        if (
            servicoOutroTexto &&
            servicoOutroTexto.value.trim()
        ) {

            outro +=
                `: ${servicoOutroTexto.value.trim()}`;
        }

        servicos.push(outro);
    }


    return servicos;
}


// ============================================================
// VALIDAR DADOS DO FORMULÁRIO
// ============================================================

function validarDadosFormulario() {

    const form =
        document.getElementById(
            "formOrcamentoPF"
        );

    if (!form) {

        alert(
            "Formulário não encontrado."
        );

        return null;
    }


    // ========================================================
    // NOME
    // ========================================================

    const nome =
        document.getElementById("nome");

    if (
        !nome ||
        !nome.value.trim()
    ) {

        alert(
            "Informe seu nome."
        );

        if (nome) {
            nome.focus();
        }

        return null;
    }


    // ========================================================
    // CPF
    // ========================================================

    const campoCPF =
        document.getElementById("cpf");

    if (!campoCPF) {

        alert(
            "Campo CPF não encontrado."
        );

        return null;
    }

    const cpf =
        campoCPF.value.trim();

    const cpfNumeros =
        cpf.replace(/\D/g, "");


    // ========================================================
    // CPF PRECISA TER EXATAMENTE 11 NÚMEROS
    // ========================================================

    if (cpfNumeros.length !== 11) {

        alert(
            "O CPF deve conter exatamente 11 números."
        );

        campoCPF.focus();

        return null;
    }


    // ========================================================
    // VALIDAÇÃO REAL DO CPF
    // ========================================================

    if (!validarCPF(cpfNumeros)) {

        alert(
            "Informe um CPF válido."
        );

        campoCPF.focus();

        return null;
    }


    // ========================================================
    // E-MAIL
    // ========================================================

    const email =
        document.getElementById("email");

    if (
        !email ||
        !validarEmail(
            email.value.trim()
        )
    ) {

        alert(
            "Informe um e-mail válido."
        );

        if (email) {
            email.focus();
        }

        return null;
    }


    // ========================================================
    // TELEFONE
    // ========================================================

    const telefone =
        document.getElementById("telefone");

    if (
        !telefone ||
        !validarTelefone(
            telefone.value
        )
    ) {

        alert(
            "Informe um telefone válido."
        );

        if (telefone) {
            telefone.focus();
        }

        return null;
    }


    // ========================================================
    // ÁREA
    // ========================================================

    const area =
        document.getElementById("area");

    if (
        !area ||
        !area.value.trim()
    ) {

        alert(
            "Informe a área aproximada."
        );

        if (area) {
            area.focus();
        }

        return null;
    }


    // ========================================================
    // CEP
    // ========================================================

    const cep =
        document.getElementById("cep");

    const cepNumeros =
        cep
            ? cep.value.replace(/\D/g, "")
            : "";

    if (cepNumeros.length !== 8) {

        alert(
            "Informe um CEP válido com 8 números."
        );

        if (cep) {
            cep.focus();
        }

        return null;
    }


    // ========================================================
    // ESTADO
    // ========================================================

    const estado =
        document.getElementById("estado");

    if (
        !estado ||
        !estado.value
    ) {

        alert(
            "Selecione o estado."
        );

        if (estado) {
            estado.focus();
        }

        return null;
    }


    // ========================================================
    // CIDADE
    // ========================================================

    const cidade =
        document.getElementById("cidade");

    if (
        !cidade ||
        !cidade.value
    ) {

        alert(
            "Selecione a cidade."
        );

        if (cidade) {
            cidade.focus();
        }

        return null;
    }


    // ========================================================
    // BAIRRO
    // ========================================================

    const bairro =
        document.getElementById("bairro");

    if (
        !bairro ||
        !bairro.value.trim()
    ) {

        alert(
            "Informe o bairro."
        );

        if (bairro) {
            bairro.focus();
        }

        return null;
    }


    // ========================================================
    // LOGRADOURO
    // ========================================================

    const logradouro =
        document.getElementById("logradouro");

    if (
        !logradouro ||
        !logradouro.value.trim()
    ) {

        alert(
            "Informe o logradouro."
        );

        if (logradouro) {
            logradouro.focus();
        }

        return null;
    }


    // ========================================================
    // NÚMERO
    // ========================================================

    const numero =
        document.getElementById("numero");

    if (
        !numero ||
        !numero.value.trim()
    ) {

        alert(
            "Informe o número."
        );

        if (numero) {
            numero.focus();
        }

        return null;
    }


    // ========================================================
    // SERVIÇOS
    // ========================================================

    const servicos =
        obterServicos();

    if (servicos.length === 0) {

        alert(
            "Selecione pelo menos um serviço."
        );

        return null;
    }


    // ========================================================
    // PRAZO
    // ========================================================

    const prazoSelecionado =
        document.querySelector(
            'input[name="prazo"]:checked'
        );

    if (!prazoSelecionado) {

        alert(
            "Selecione o prazo desejado."
        );

        return null;
    }


    // ========================================================
    // RETORNO DOS DADOS
    // ========================================================

    return {

        nome:
            nome.value.trim(),

        cpf:
            cpfNumeros,

        email:
            email.value.trim(),

        telefone:
            telefone.value.trim(),

        area:
            area.value.trim(),

        cep:
            cepNumeros,

        estado:
            estado.value,

        cidade:
            cidade.value,

        bairro:
            bairro.value.trim(),

        logradouro:
            logradouro.value.trim(),

        numero:
            numero.value.trim(),

        complemento:
            document
                .getElementById("complemento")
                ?.value
                .trim() || "",

        servicos:
            servicos,

        prazo:
            prazoSelecionado.value
    };
}


// ============================================================
// GERAR PDF
// ============================================================

function gerarPDF() {

    const dados =
        validarDadosFormulario();

    if (!dados) {
        return;
    }

    if (
        typeof window.jspdf ===
        "undefined"
    ) {

        alert(
            "Não foi possível carregar o gerador de PDF."
        );

        return;
    }

    const {
        jsPDF
    } = window.jspdf;

    const doc =
        new jsPDF();

    let y = 20;


    // ========================================================
    // TÍTULO
    // ========================================================

    doc.setFontSize(18);

    doc.text(
        "Solicitação de Orçamento",
        20,
        y
    );

    y += 15;


    // ========================================================
    // DADOS DO CLIENTE
    // ========================================================

    doc.setFontSize(11);

    doc.text(
        `Nome: ${dados.nome}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `CPF: ${dados.cpf}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `E-mail: ${dados.email}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `Telefone: ${dados.telefone}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `Área aproximada: ${dados.area}`,
        20,
        y
    );

    y += 12;


    // ========================================================
    // ENDEREÇO
    // ========================================================

    doc.setFontSize(13);

    doc.text(
        "Endereço",
        20,
        y
    );

    y += 9;

    doc.setFontSize(11);

    doc.text(
        `CEP: ${dados.cep}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `Estado: ${dados.estado}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `Cidade: ${dados.cidade}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `Bairro: ${dados.bairro}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `Logradouro: ${dados.logradouro}`,
        20,
        y
    );

    y += 8;

    doc.text(
        `Número: ${dados.numero}`,
        20,
        y
    );

    y += 8;

    if (dados.complemento) {

        doc.text(
            `Complemento: ${dados.complemento}`,
            20,
            y
        );

        y += 8;
    }


    // ========================================================
    // SERVIÇOS
    // ========================================================

    y += 5;

    doc.setFontSize(13);

    doc.text(
        "Serviços solicitados",
        20,
        y
    );

    y += 9;

    doc.setFontSize(11);

    dados.servicos.forEach(
        servico => {

            doc.text(
                `- ${servico}`,
                20,
                y
            );

            y += 7;
        }
    );


    // ========================================================
    // PRAZO
    // ========================================================

    y += 5;

    doc.text(
        `Prazo desejado: ${dados.prazo}`,
        20,
        y
    );


    // ========================================================
    // SALVAR
    // ========================================================

    doc.save(
        "solicitacao-orcamento.pdf"
    );
}


// ============================================================
// ENVIAR PARA WHATSAPP
// ============================================================

function enviarWhatsApp() {

    const dados =
        validarDadosFormulario();

    if (!dados) {
        return;
    }


    // ========================================================
    // MONTAR MENSAGEM
    // ========================================================

    let mensagem =
        "Olá! Gostaria de solicitar um orçamento.%0A%0A";

    mensagem +=
        `*Nome:* ${dados.nome}%0A`;

    mensagem +=
        `*CPF:* ${dados.cpf}%0A`;

    mensagem +=
        `*E-mail:* ${dados.email}%0A`;

    mensagem +=
        `*Telefone:* ${dados.telefone}%0A`;

    mensagem +=
        `*Área aproximada:* ${dados.area}%0A%0A`;


    mensagem +=
        "*Endereço:*%0A";

    mensagem +=
        `CEP: ${dados.cep}%0A`;

    mensagem +=
        `Estado: ${dados.estado}%0A`;

    mensagem +=
        `Cidade: ${dados.cidade}%0A`;

    mensagem +=
        `Bairro: ${dados.bairro}%0A`;

    mensagem +=
        `Logradouro: ${dados.logradouro}%0A`;

    mensagem +=
        `Número: ${dados.numero}%0A`;

    if (dados.complemento) {

        mensagem +=
            `Complemento: ${dados.complemento}%0A`;
    }


    mensagem +=
        "%0A*Serviços solicitados:*%0A";

    dados.servicos.forEach(
        servico => {

            mensagem +=
                `- ${servico}%0A`;
        }
    );


    mensagem +=
        `%0A*Prazo desejado:* ${dados.prazo}`;


    // ========================================================
    // ABRIR WHATSAPP
    // ========================================================

    const url =
        `https://wa.me/${NUMERO_WHATSAPP_EMPRESA}?text=${mensagem}`;

    window.open(
        url,
        "_blank"
    );
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {


        // ====================================================
        // ELEMENTOS
        // ====================================================

        const form =
            document.getElementById(
                "formOrcamentoPF"
            );

        const campoCPF =
            document.getElementById("cpf");

        const campoTelefone =
            document.getElementById("telefone");

        const campoCEP =
            document.getElementById("cep");

        const estado =
            document.getElementById("estado");

        const btnWhatsApp =
            document.getElementById(
                "btnWhatsApp"
            );

        const btnGerarPDF =
            document.getElementById(
                "btnGerarPDF"
            );


        // ====================================================
        // CARREGAR ESTADOS
        // ====================================================

        carregarEstados();


        // ====================================================
        // MÁSCARA CPF
        // ====================================================

        if (campoCPF) {

            campoCPF.addEventListener(
                "input",
                function () {

                    this.value =
                        aplicarMascaraCPF(
                            this.value
                        );
                }
            );
        }


        // ====================================================
        // MÁSCARA TELEFONE
        // ====================================================

        if (campoTelefone) {

            campoTelefone.addEventListener(
                "input",
                function () {

                    this.value =
                        aplicarMascaraTelefone(
                            this.value
                        );
                }
            );
        }


        // ====================================================
        // MÁSCARA CEP
        // ====================================================

        if (campoCEP) {

            campoCEP.addEventListener(
                "input",
                function () {

                    this.value =
                        aplicarMascaraCEP(
                            this.value
                        );

                    if (
                        this.value.replace(
                            /\D/g,
                            ""
                        ).length === 8
                    ) {

                        buscarCEP();
                    }
                }
            );

            campoCEP.addEventListener(
                "blur",
                buscarCEP
            );
        }


        // ====================================================
        // ESTADO
        // ====================================================

        if (estado) {

            estado.addEventListener(
                "change",
                selecionarEstado
            );
        }


        // ====================================================
        // ENVIO DO FORMULÁRIO
        // ====================================================

        if (form) {

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    const dados =
                        validarDadosFormulario();

                    if (!dados) {
                        return;
                    }

                    alert(
                        "Dados validados com sucesso!"
                    );
                }
            );
        }


        // ====================================================
        // BOTÃO WHATSAPP
        // ====================================================

        if (btnWhatsApp) {

            btnWhatsApp.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    enviarWhatsApp();
                }
            );
        }


        // ====================================================
        // BOTÃO PDF
        // ====================================================

        if (btnGerarPDF) {

            btnGerarPDF.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    gerarPDF();
                }
            );
        }

    }
);