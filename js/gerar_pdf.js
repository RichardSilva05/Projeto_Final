// =========================================================
// GERAR PDF - SABINO GESSO
// =========================================================


// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

function somenteNumeros(valor) {
    return valor.replace(/\D/g, "");
}


// =========================================================
// MOSTRAR ERRO
// =========================================================

function mostrarErro(mensagem, campo = null) {

    alert(mensagem);

    if (campo) {
        campo.focus();
    }

}


// =========================================================
// VALIDAR CPF
// =========================================================

function validarCPF(cpf) {

    cpf = somenteNumeros(cpf);

    if (cpf.length !== 11) {
        return false;
    }

    if (/^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;
    let resto;

    // Primeiro dígito
    for (let i = 1; i <= 9; i++) {

        soma +=
            parseInt(cpf.charAt(i - 1)) *
            (11 - i);

    }

    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11) {
        resto = 0;
    }

    if (resto !== parseInt(cpf.charAt(9))) {
        return false;
    }

    // Segundo dígito
    soma = 0;

    for (let i = 1; i <= 10; i++) {

        soma +=
            parseInt(cpf.charAt(i - 1)) *
            (12 - i);

    }

    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11) {
        resto = 0;
    }

    return resto === parseInt(cpf.charAt(10));

}


// =========================================================
// VALIDAR E-MAIL
// =========================================================

function validarEmail(email) {

    const regex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);

}


// =========================================================
// BUSCAR ENDEREÇO PELO CEP
// API VIA CEP
// =========================================================

async function buscarCEP() {

    const campoCEP =
        document.getElementById("cep");

    const campoEstado =
        document.getElementById("estado");

    const campoCidade =
        document.getElementById("cidade");

    const campoBairro =
        document.getElementById("bairro");

    const campoLogradouro =
        document.getElementById("logradouro");


    // =====================================================
    // VERIFICAR SE OS CAMPOS EXISTEM
    // =====================================================

    if (
        !campoCEP ||
        !campoEstado ||
        !campoCidade ||
        !campoBairro ||
        !campoLogradouro
    ) {

        console.error(
            "Um ou mais campos de endereço não foram encontrados."
        );

        return;

    }


    // =====================================================
    // PEGAR SOMENTE OS NÚMEROS DO CEP
    // =====================================================

    const cep =
        somenteNumeros(campoCEP.value);


    // =====================================================
    // SE NÃO TIVER CEP COMPLETO, NÃO CONSULTA
    // =====================================================

    if (cep.length !== 8) {

        return;

    }


    // =====================================================
    // LIMPAR CAMPOS ANTES DA CONSULTA
    // =====================================================

    campoEstado.value = "";
    campoCidade.value = "";
    campoBairro.value = "";
    campoLogradouro.value = "";


    // =====================================================
    // BLOQUEAR CEP DURANTE CONSULTA
    // =====================================================

    campoCEP.disabled = true;

    campoCEP.placeholder =
        "Consultando CEP...";


    try {

        // =================================================
        // CONSULTA VIA CEP
        // =================================================

        const resposta =
            await fetch(
                "https://viacep.com.br/ws/" +
                cep +
                "/json/"
            );


        // =================================================
        // VERIFICAR RESPOSTA
        // =================================================

        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP: " +
                resposta.status
            );

        }


        const dados =
            await resposta.json();


        console.log(
            "Resposta ViaCEP:",
            dados
        );


        // =================================================
        // CEP NÃO ENCONTRADO
        // =================================================

        if (dados.erro) {

            limparEndereco();

            alert(
                "CEP não encontrado. Verifique o número informado."
            );

            campoCEP.focus();

            return;

        }


        // =================================================
        // PREENCHER ENDEREÇO
        // =================================================

        campoEstado.value =
            dados.uf || "";

        campoCidade.value =
            dados.localidade || "";

        campoBairro.value =
            dados.bairro || "";

        campoLogradouro.value =
            dados.logradouro || "";


        // =================================================
        // CAMPOS RETORNADOS PELA API FICAM BLOQUEADOS
        // =================================================

        campoEstado.readOnly =
            dados.uf !== "";

        campoCidade.readOnly =
            dados.localidade !== "";

        campoBairro.readOnly =
            dados.bairro !== "";

        campoLogradouro.readOnly =
            dados.logradouro !== "";


        console.log(
            "Endereço preenchido com sucesso."
        );


    } catch (erro) {

        console.error(
            "Erro ao consultar CEP:",
            erro
        );


        limparEndereco();


        alert(
            "Não foi possível consultar o CEP. Verifique sua conexão com a internet e tente novamente."
        );


    } finally {

        // =================================================
        // LIBERAR CEP
        // =================================================

        campoCEP.disabled = false;

        campoCEP.placeholder =
            "CEP";

    }

}


// =========================================================
// LIMPAR ENDEREÇO
// =========================================================

function limparEndereco() {

    const estado =
        document.getElementById("estado");

    const cidade =
        document.getElementById("cidade");

    const bairro =
        document.getElementById("bairro");

    const logradouro =
        document.getElementById("logradouro");


    if (estado) {

        estado.value = "";
        estado.readOnly = true;

    }


    if (cidade) {

        cidade.value = "";
        cidade.readOnly = true;

    }


    if (bairro) {

        bairro.value = "";
        bairro.readOnly = true;

    }


    if (logradouro) {

        logradouro.value = "";
        logradouro.readOnly = true;

    }

}


// =========================================================
// MÁSCARA DE CEP
// =========================================================

function aplicarMascaraCEP(campo) {

    let cep =
        somenteNumeros(campo.value);


    cep =
        cep.substring(0, 8);


    if (cep.length > 5) {

        cep =
            cep.substring(0, 5) +
            "-" +
            cep.substring(5);

    }


    campo.value = cep;

}


// =========================================================
// MÁSCARA DE CPF
// =========================================================

function aplicarMascaraCPF(campo) {

    let cpf =
        somenteNumeros(campo.value);


    cpf =
        cpf.substring(0, 11);


    if (cpf.length > 9) {

        cpf =
            cpf.substring(0, 3) +
            "." +
            cpf.substring(3, 6) +
            "." +
            cpf.substring(6, 9) +
            "-" +
            cpf.substring(9, 11);

    }

    else if (cpf.length > 6) {

        cpf =
            cpf.substring(0, 3) +
            "." +
            cpf.substring(3, 6) +
            "." +
            cpf.substring(6);

    }

    else if (cpf.length > 3) {

        cpf =
            cpf.substring(0, 3) +
            "." +
            cpf.substring(3);

    }


    campo.value = cpf;

}


// =========================================================
// MÁSCARA DE TELEFONE
// =========================================================

function aplicarMascaraTelefone(campo) {

    let telefone =
        somenteNumeros(campo.value);


    telefone =
        telefone.substring(0, 11);


    if (telefone.length > 10) {

        telefone =
            "(" +
            telefone.substring(0, 2) +
            ") " +
            telefone.substring(2, 7) +
            "-" +
            telefone.substring(7, 11);

    }

    else if (telefone.length > 6) {

        telefone =
            "(" +
            telefone.substring(0, 2) +
            ") " +
            telefone.substring(2, 6) +
            "-" +
            telefone.substring(6, 10);

    }

    else if (telefone.length > 2) {

        telefone =
            "(" +
            telefone.substring(0, 2) +
            ") " +
            telefone.substring(2);

    }


    campo.value = telefone;

}


// =========================================================
// OBTER SERVIÇOS
// =========================================================

function obterServicos() {

    const servicos = [];


    if (
        document.getElementById("servicoSanca").checked
    ) {

        servicos.push("Sanca");

    }


    if (
        document.getElementById("servicoForro").checked
    ) {

        servicos.push("Forro rebaixado");

    }


    if (
        document.getElementById("servicoMoldura").checked
    ) {

        servicos.push("Moldura decorativa");

    }


    if (
        document.getElementById("servicoDivisoria").checked
    ) {

        servicos.push("Divisória");

    }


    const servicoOutro =
        document.getElementById("servicoOutro");


    const outroTexto =
        document.getElementById("servicoOutroTexto");


    if (
        servicoOutro &&
        servicoOutro.checked
    ) {

        const texto =
            outroTexto.value.trim();


        if (texto !== "") {

            servicos.push(
                "Outro: " + texto
            );

        }

    }


    return servicos;

}

// =========================================================
// CARREGAR LOGO
// =========================================================

function carregarLogo() {

    return new Promise(function (resolve, reject) {

        const imagem = new Image();

        imagem.onload = function () {
            resolve(imagem);
        };

        imagem.onerror = function () {
            reject(
                new Error("Não foi possível carregar a logo.")
            );
        };

        imagem.src = "../img/logo.png";

    });

}

// =========================================================
// GERAR PDF
// =========================================================

function gerarPDF(event) {

    if (event) {
        event.preventDefault();
    }


    // =====================================================
    // CAPTURA DOS CAMPOS
    // =====================================================

    const nome =
        document.getElementById("nome");

    const cpf =
        document.getElementById("cpf");

    const email =
        document.getElementById("email");

    const telefone =
        document.getElementById("telefone");

    const area =
        document.getElementById("area");

    const cep =
        document.getElementById("cep");

    const estado =
        document.getElementById("estado");

    const cidade =
        document.getElementById("cidade");

    const bairro =
        document.getElementById("bairro");

    const logradouro =
        document.getElementById("logradouro");

    const numero =
        document.getElementById("numero");

    const complemento =
        document.getElementById("complemento");

    const servicoOutro =
        document.getElementById("servicoOutro");

    const outroTexto =
        document.getElementById("servicoOutroTexto");


    // =====================================================
    // NOME
    // =====================================================

    const nomeValor =
        nome.value.trim();


    if (nomeValor === "") {

        mostrarErro(
            "Por favor, informe seu nome.",
            nome
        );

        return;

    }


    if (nomeValor.length < 3) {

        mostrarErro(
            "Informe seu nome completo.",
            nome
        );

        return;

    }


    // =====================================================
    // CPF
    // =====================================================

    if (cpf.value.trim() === "") {

        mostrarErro(
            "Por favor, informe seu CPF.",
            cpf
        );

        return;

    }


    if (!validarCPF(cpf.value)) {

        mostrarErro(
            "O CPF informado é inválido.",
            cpf
        );

        return;

    }


    // =====================================================
    // E-MAIL
    // =====================================================

    const emailValor =
        email.value.trim();


    if (emailValor === "") {

        mostrarErro(
            "Por favor, informe seu e-mail.",
            email
        );

        return;

    }


    if (!validarEmail(emailValor)) {

        mostrarErro(
            "Informe um endereço de e-mail válido.",
            email
        );

        return;

    }


    // =====================================================
    // TELEFONE
    // =====================================================

    const telefoneNumeros =
        somenteNumeros(
            telefone.value
        );


    if (
        telefoneNumeros.length !== 10 &&
        telefoneNumeros.length !== 11
    ) {

        mostrarErro(
            "Informe um telefone válido com DDD.",
            telefone
        );

        return;

    }


    // =====================================================
    // SERVIÇOS
    // =====================================================

    if (
        servicoOutro &&
        servicoOutro.checked &&
        outroTexto.value.trim() === ""
    ) {

        mostrarErro(
            "Você selecionou 'Outro'. Informe qual serviço deseja solicitar.",
            outroTexto
        );

        return;

    }


    const servicos =
        obterServicos();


    if (servicos.length === 0) {

        mostrarErro(
            "Selecione pelo menos um serviço."
        );

        return;

    }


    // =====================================================
    // ÁREA
    // =====================================================

    const areaValor =
        area.value
            .trim()
            .replace(",", ".");


    if (areaValor === "") {

        mostrarErro(
            "Informe a área aproximada do serviço.",
            area
        );

        return;

    }


    if (
        isNaN(areaValor) ||
        Number(areaValor) <= 0
    ) {

        mostrarErro(
            "Informe uma área válida maior que zero.",
            area
        );

        return;

    }


    // =====================================================
    // PRAZO
    // =====================================================

    const prazoSelecionado =
        document.querySelector(
            'input[name="prazo"]:checked'
        );


    if (!prazoSelecionado) {

        mostrarErro(
            "Selecione o prazo desejado."
        );

        return;

    }


    const prazo =
        prazoSelecionado.value;


    // =====================================================
    // CEP
    // =====================================================

    const cepNumeros =
        somenteNumeros(
            cep.value
        );


    if (cepNumeros.length !== 8) {

        mostrarErro(
            "Informe um CEP válido com 8 números.",
            cep
        );

        return;

    }


    // =====================================================
    // ESTADO
    // =====================================================

    if (estado.value.trim() === "") {

        mostrarErro(
            "Informe o estado.",
            estado
        );

        return;

    }


    // =====================================================
    // CIDADE
    // =====================================================

    if (cidade.value.trim() === "") {

        mostrarErro(
            "Informe a cidade.",
            cidade
        );

        return;

    }


    // =====================================================
    // BAIRRO
    // =====================================================

    if (bairro.value.trim() === "") {

        mostrarErro(
            "Informe o bairro.",
            bairro
        );

        return;

    }


    // =====================================================
    // LOGRADOURO
    // =====================================================

    if (logradouro.value.trim() === "") {

        mostrarErro(
            "Informe o logradouro.",
            logradouro
        );

        return;

    }


    // =====================================================
    // NÚMERO
    // =====================================================

    if (numero.value.trim() === "") {

        mostrarErro(
            "Informe o número do endereço.",
            numero
        );

        return;

    }


    // =====================================================
    // VERIFICAR jsPDF
    // =====================================================

    if (
        typeof window.jspdf === "undefined"
    ) {

        alert(
            "Não foi possível carregar a biblioteca de PDF. Recarregue a página e tente novamente."
        );

        return;

    }


    // =====================================================
    // CRIAR PDF
    // =====================================================

    const {
        jsPDF
    } = window.jspdf;


    const pdf =
        new jsPDF();


    const margem = 20;


    // =====================================================
    // CABEÇALHO
    // =====================================================

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(22);

    pdf.text(
        "Sabino Gesso",
        margem,
        20
    );


    pdf.setFontSize(16);

    pdf.text(
        "Solicitação de Orçamento",
        margem,
        32
    );


    pdf.setLineWidth(0.5);

    pdf.line(
        margem,
        38,
        190,
        38
    );


    // =====================================================
    // DADOS DO CLIENTE
    // =====================================================

    pdf.setFontSize(13);

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.text(
        "DADOS DO CLIENTE",
        margem,
        52
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(11);


    pdf.text(
        "Nome: " + nomeValor,
        margem,
        62
    );


    pdf.text(
        "CPF: " + cpf.value.trim(),
        margem,
        70
    );


    pdf.text(
        "E-mail: " + emailValor,
        margem,
        78
    );


    pdf.text(
        "Telefone: " +
        telefone.value.trim(),
        margem,
        86
    );


    // =====================================================
    // SERVIÇO
    // =====================================================

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(13);

    pdf.text(
        "SOBRE O SERVIÇO",
        margem,
        101
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(11);


    const servicosTexto =
        servicos.join(", ");


    const linhasServicos =
        pdf.splitTextToSize(
            "Serviços: " +
            servicosTexto,
            170
        );


    pdf.text(
        linhasServicos,
        margem,
        111
    );


    pdf.text(
        "Área aproximada: " +
        areaValor.replace(".", ",") +
        " m²",
        margem,
        121
    );


    pdf.text(
        "Prazo desejado: " +
        prazo,
        margem,
        129
    );


    // =====================================================
    // ENDEREÇO
    // =====================================================

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(13);

    pdf.text(
        "ENDEREÇO DO ORÇAMENTO",
        margem,
        144
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(11);


    pdf.text(
        "CEP: " +
        cep.value.trim(),
        margem,
        154
    );


    pdf.text(
        "Estado: " +
        estado.value.trim(),
        margem,
        162
    );


    pdf.text(
        "Cidade: " +
        cidade.value.trim(),
        margem,
        170
    );


    pdf.text(
        "Bairro: " +
        bairro.value.trim(),
        margem,
        178
    );


    pdf.text(
        "Logradouro: " +
        logradouro.value.trim(),
        margem,
        186
    );


    pdf.text(
        "Número: " +
        numero.value.trim(),
        margem,
        194
    );


    // =====================================================
    // OBSERVAÇÕES
    // =====================================================

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(13);

    pdf.text(
        "COMPLEMENTO / OBSERVAÇÕES",
        margem,
        209
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(11);


    const textoObservacoes =
        complemento.value.trim() !== ""
            ? complemento.value.trim()
            : "Nenhuma observação informada.";


    const linhasObservacoes =
        pdf.splitTextToSize(
            textoObservacoes,
            170
        );


    pdf.text(
        linhasObservacoes,
        margem,
        219
    );


    // =====================================================
    // RODAPÉ
    // =====================================================

    pdf.setFontSize(9);

    pdf.text(
        "Documento gerado pelo site Sabino Gesso",
        margem,
        285
    );


    pdf.text(
        "© 2026 - Sabino Gesso",
        margem,
        291
    );


    // =====================================================
    // DOWNLOAD
    // =====================================================

    pdf.save(
        "solicitacao-orcamento-sabino-gesso.pdf"
    );

}


// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // =================================================
        // CAMPOS
        // =================================================

        const formulario =
            document.getElementById(
                "formOrcamentoPF"
            );


        const campoCEP =
            document.getElementById("cep");


        const campoCPF =
            document.getElementById("cpf");


        const campoTelefone =
            document.getElementById("telefone");


        const servicoOutro =
            document.getElementById(
                "servicoOutro"
            );


        const servicoOutroTexto =
            document.getElementById(
                "servicoOutroTexto"
            );


        const btnGerarPDF =
            document.getElementById(
                "btnGerarPDF"
            );


        // =================================================
        // FORMULÁRIO
        // =================================================

        if (formulario) {

            formulario.addEventListener(
                "submit",
                gerarPDF
            );

        }


        // =================================================
        // BOTÃO PDF DA NAVBAR
        // =================================================

        if (btnGerarPDF) {

            btnGerarPDF.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    gerarPDF(event);

                }
            );

        }


        // =================================================
        // MÁSCARA CPF
        // =================================================

        if (campoCPF) {

            campoCPF.addEventListener(
                "input",
                function () {

                    aplicarMascaraCPF(
                        campoCPF
                    );

                }
            );

        }


        // =================================================
        // MÁSCARA TELEFONE
        // =================================================

        if (campoTelefone) {

            campoTelefone.addEventListener(
                "input",
                function () {

                    aplicarMascaraTelefone(
                        campoTelefone
                    );

                }
            );

        }


        // =================================================
        // MÁSCARA E CONSULTA CEP
        // =================================================

        if (campoCEP) {

            // Máscara enquanto digita
            campoCEP.addEventListener(
                "input",
                function () {

                    aplicarMascaraCEP(
                        campoCEP
                    );

                }
            );


            // Consulta automaticamente ao sair do campo
            campoCEP.addEventListener(
                "blur",
                function () {

                    buscarCEP();

                }
            );

        }


        // =================================================
        // OUTRO SERVIÇO
        // =================================================

        if (
            servicoOutro &&
            servicoOutroTexto
        ) {

            servicoOutroTexto.disabled =
                !servicoOutro.checked;


            servicoOutro.addEventListener(
                "change",
                function () {

                    if (
                        servicoOutro.checked
                    ) {

                        servicoOutroTexto.disabled =
                            false;

                        servicoOutroTexto.focus();

                    } else {

                        servicoOutroTexto.disabled =
                            true;

                        servicoOutroTexto.value =
                            "";

                    }

                }
            );

        }

    }
);