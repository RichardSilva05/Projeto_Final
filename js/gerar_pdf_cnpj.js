// ============================================================
// CONFIGURAÇÕES
// ============================================================

const NUMERO_WHATSAPP_EMPRESA = "5511999999999";

let estadosCarregamento = null;


// ============================================================
// FUNÇÃO AUXILIAR
// ============================================================

function somenteNumeros(valor) {
    return valor.replace(/\D/g, "");
}


// ============================================================
// MÁSCARA CNPJ
// ============================================================

function aplicarMascaraCNPJ(valor) {

    let numeros = somenteNumeros(valor);

    if (numeros.length > 14) {
        numeros = numeros.substring(0, 14);
    }

    numeros = numeros.replace(
        /(\d{2})(\d)/,
        "$1.$2"
    );

    numeros = numeros.replace(
        /(\d{3})(\d)/,
        "$1.$2"
    );

    numeros = numeros.replace(
        /(\d{3})(\d)/,
        "$1/$2"
    );

    numeros = numeros.replace(
        /(\d{4})(\d{1,2})$/,
        "$1-$2"
    );

    return numeros;
}


// ============================================================
// MÁSCARA TELEFONE
// ============================================================

function aplicarMascaraTelefone(valor) {

    let numeros = somenteNumeros(valor);

    if (numeros.length > 11) {
        numeros = numeros.substring(0, 11);
    }

    if (numeros.length <= 10) {

        numeros = numeros.replace(
            /(\d{2})(\d)/,
            "($1) $2"
        );

        numeros = numeros.replace(
            /(\d{4})(\d)/,
            "$1-$2"
        );

    } else {

        numeros = numeros.replace(
            /(\d{2})(\d)/,
            "($1) $2"
        );

        numeros = numeros.replace(
            /(\d{5})(\d)/,
            "$1-$2"
        );
    }

    return numeros;
}


// ============================================================
// MÁSCARA CEP
// ============================================================

function aplicarMascaraCEP(valor) {

    let numeros = somenteNumeros(valor);

    if (numeros.length > 8) {
        numeros = numeros.substring(0, 8);
    }

    if (numeros.length > 5) {
        numeros = numeros.replace(
            /(\d{5})(\d)/,
            "$1-$2"
        );
    }

    return numeros;
}


// ============================================================
// VALIDAÇÃO CNPJ
// ============================================================

function validarCNPJ(cnpj) {

    cnpj = somenteNumeros(cnpj);

    if (cnpj.length !== 14) {
        return false;
    }

    // Impede CNPJs formados pelo mesmo número
    if (/^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }

    let tamanho = 12;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);

    let soma = 0;
    let posicao = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {

        soma +=
            parseInt(numeros.charAt(tamanho - i)) *
            posicao;

        posicao--;

        if (posicao < 2) {
            posicao = 9;
        }
    }

    let resultado = soma % 11 < 2
        ? 0
        : 11 - (soma % 11);

    if (resultado !== parseInt(digitos.charAt(0))) {
        return false;
    }

    tamanho = 13;
    numeros = cnpj.substring(0, tamanho);

    soma = 0;
    posicao = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {

        soma +=
            parseInt(numeros.charAt(tamanho - i)) *
            posicao;

        posicao--;

        if (posicao < 2) {
            posicao = 9;
        }
    }

    resultado = soma % 11 < 2
        ? 0
        : 11 - (soma % 11);

    return resultado === parseInt(digitos.charAt(1));
}


// ============================================================
// VALIDAÇÃO E-MAIL
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

    const campoEstado =
        document.getElementById("estado");

    if (!campoEstado) {
        return;
    }

    try {

        campoEstado.disabled = true;

        campoEstado.innerHTML =
            '<option value="">Carregando estados...</option>';

        const resposta = await fetch(
            "https://brasilapi.com.br/api/ibge/uf/v1"
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao carregar estados."
            );
        }

        const estados =
            await resposta.json();

        estados.sort((a, b) =>
            a.nome.localeCompare(b.nome)
        );

        campoEstado.innerHTML =
            '<option value="">Estado</option>';

        estados.forEach(estado => {

            const option =
                document.createElement("option");

            option.value =
                estado.sigla;

            option.textContent =
                estado.nome;

            campoEstado.appendChild(option);
        });

        campoEstado.disabled = false;

    } catch (erro) {

        console.error(
            "Erro ao carregar estados:",
            erro
        );

        campoEstado.innerHTML =
            '<option value="">Erro ao carregar estados</option>';
    }
}


// ============================================================
// CARREGAR CIDADES
// ============================================================

async function carregarCidades(
    uf,
    cidadeSelecionada = ""
) {

    const campoCidade =
        document.getElementById("cidade");

    if (!campoCidade || !uf) {
        return;
    }

    campoCidade.disabled = true;

    campoCidade.innerHTML =
        '<option value="">Carregando cidades...</option>';

    try {

        const resposta = await fetch(
            `https://brasilapi.com.br/api/ibge/municipios/v1/${uf}?providers=dados-abertos-br,gov,wikipedia`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao carregar cidades."
            );
        }

        const cidades =
            await resposta.json();

        cidades.sort((a, b) =>
            a.nome.localeCompare(b.nome)
        );

        campoCidade.innerHTML =
            '<option value="">Cidade</option>';

        cidades.forEach(cidade => {

            const option =
                document.createElement("option");

            option.value =
                cidade.nome;

            option.textContent =
                cidade.nome;

            campoCidade.appendChild(option);
        });

        campoCidade.disabled = false;

        if (cidadeSelecionada) {

            const opcao =
                [...campoCidade.options].find(
                    option =>
                        option.value.toLowerCase() ===
                        cidadeSelecionada.toLowerCase()
                );

            if (opcao) {
                campoCidade.value =
                    opcao.value;
            }
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar cidades:",
            erro
        );

        campoCidade.innerHTML =
            '<option value="">Erro ao carregar cidades</option>';

        campoCidade.disabled = true;
    }
}


// ============================================================
// BUSCAR CEP
// ============================================================

async function buscarCEP() {

    const campoCEP =
        document.getElementById("cep");

    const campoEstado =
        document.getElementById("estado");

    const campoBairro =
        document.getElementById("bairro");

    const campoLogradouro =
        document.getElementById("logradouro");

    if (!campoCEP) {
        return;
    }

    const cep =
        somenteNumeros(campoCEP.value);

    if (cep.length !== 8) {
        return;
    }

    try {

        // Aguarda os estados carregarem
        if (estadosCarregamento) {
            await estadosCarregamento;
        }

        const resposta = await fetch(
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
                "CEP não encontrado. Verifique o número informado."
            );

            limparEndereco();

            return;
        }


        // ----------------------------------------------------
        // BAIRRO
        // ----------------------------------------------------

        campoBairro.value =
            dados.bairro || "";

        campoBairro.readOnly =
            !!dados.bairro;


        // ----------------------------------------------------
        // LOGRADOURO
        // ----------------------------------------------------

        campoLogradouro.value =
            dados.logradouro || "";

        campoLogradouro.readOnly =
            !!dados.logradouro;


        // ----------------------------------------------------
        // ESTADO
        // ----------------------------------------------------

        if (dados.uf) {

            campoEstado.value =
                dados.uf;

            await carregarCidades(
                dados.uf,
                dados.localidade
            );
        }

    } catch (erro) {

        console.error(
            "Erro ao consultar CEP:",
            erro
        );

        alert(
            "Não foi possível consultar o CEP automaticamente. " +
            "Você poderá preencher o endereço manualmente."
        );

        limparEndereco();
    }
}


// ============================================================
// LIMPAR ENDEREÇO
// ============================================================

function limparEndereco() {

    const campoEstado =
        document.getElementById("estado");

    const campoCidade =
        document.getElementById("cidade");

    const campoBairro =
        document.getElementById("bairro");

    const campoLogradouro =
        document.getElementById("logradouro");


    if (campoEstado) {
        campoEstado.value = "";
    }


    if (campoCidade) {

        campoCidade.innerHTML =
            '<option value="">Cidade</option>';

        campoCidade.value = "";

        campoCidade.disabled = true;
    }


    if (campoBairro) {

        campoBairro.value = "";

        campoBairro.readOnly = false;
    }


    if (campoLogradouro) {

        campoLogradouro.value = "";

        campoLogradouro.readOnly = false;
    }
}


// ============================================================
// OBTER SERVIÇOS
// ============================================================

function obterServicos() {

    const servicos = [];

    document
        .querySelectorAll(
            'input[name="servicos"]:checked'
        )
        .forEach(item => {

            if (item.id === "servicoOutro") {
                return;
            }

            servicos.push(item.value);
        });


    const outro =
        document.getElementById(
            "servicoOutro"
        );

    const outroTexto =
        document.getElementById(
            "servicoOutroTexto"
        );


    if (
        outro &&
        outro.checked &&
        outroTexto &&
        outroTexto.value.trim()
    ) {

        servicos.push(
            `Outro: ${outroTexto.value.trim()}`
        );
    }


    return servicos;
}


// ============================================================
// OBTER PRAZO
// ============================================================

function obterPrazo() {

    const prazo =
        document.querySelector(
            'input[name="prazo"]:checked'
        );

    return prazo
        ? prazo.value
        : "";
}


// ============================================================
// GERAR PDF CNPJ
// ============================================================

async function gerarPDF(event) {

    if (event) {
        event.preventDefault();
    }

    const formulario =
        document.getElementById(
            "formOrcamentoPJ"
        );


    if (!formulario.checkValidity()) {

        formulario.reportValidity();

        return;
    }


    // ========================================================
    // DADOS DA EMPRESA
    // ========================================================

    const razaoSocial =
        document.getElementById(
            "razaoSocial"
        ).value.trim();


    const nomeFantasia =
        document.getElementById(
            "nomeFantasia"
        ).value.trim();


    const cnpj =
        document.getElementById(
            "cnpj"
        ).value.trim();


    const email =
        document.getElementById(
            "email"
        ).value.trim();


    const telefone =
        document.getElementById(
            "telefone"
        ).value.trim();


    const responsavel =
        document.getElementById(
            "responsavel"
        ).value.trim();


    // ========================================================
    // VALIDAÇÕES
    // ========================================================

    if (!validarCNPJ(cnpj)) {

        alert(
            "Informe um CNPJ válido."
        );

        document
            .getElementById("cnpj")
            .focus();

        return;
    }


    if (!validarEmail(email)) {

        alert(
            "Informe um e-mail válido."
        );

        document
            .getElementById("email")
            .focus();

        return;
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

        return;
    }


    // ========================================================
    // ÁREA
    // ========================================================

    const area =
        document.getElementById(
            "area"
        ).value.trim();


    const areaNumerica =
        parseFloat(
            area.replace(",", ".")
        );


    if (
        isNaN(areaNumerica) ||
        areaNumerica <= 0
    ) {

        alert(
            "Informe uma área válida."
        );

        document
            .getElementById("area")
            .focus();

        return;
    }


    // ========================================================
    // PRAZO
    // ========================================================

    const prazo =
        obterPrazo();


    if (!prazo) {

        alert(
            "Selecione o prazo desejado."
        );

        return;
    }


    // ========================================================
    // ENDEREÇO
    // ========================================================

    const cep =
        document.getElementById(
            "cep"
        ).value.trim();


    const estado =
        document.getElementById(
            "estado"
        );


    const estadoTexto =
        estado.options[
            estado.selectedIndex
        ]?.text || "";


    const cidade =
        document.getElementById(
            "cidade"
        ).value.trim();


    const bairro =
        document.getElementById(
            "bairro"
        ).value.trim();


    const logradouro =
        document.getElementById(
            "logradouro"
        ).value.trim();


    const numero =
        document.getElementById(
            "numero"
        ).value.trim();


    const complemento =
        document.getElementById(
            "complemento"
        ).value.trim();


    // ========================================================
    // CRIA PDF
    // ========================================================

    const { jsPDF } =
        window.jspdf;


    const pdf =
        new jsPDF();


    let y = 20;


    pdf.setFontSize(18);

    pdf.text(
        "Solicitação de Orçamento para CNPJ",
        20,
        y
    );


    y += 15;


    pdf.setFontSize(12);


    // ========================================================
    // EMPRESA
    // ========================================================

    pdf.text(
        "DADOS DA EMPRESA",
        20,
        y
    );

    y += 8;


    pdf.text(
        `Razão Social: ${razaoSocial}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Nome Fantasia: ${nomeFantasia}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `CNPJ: ${cnpj}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `E-mail: ${email}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Telefone: ${telefone}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Responsável: ${responsavel}`,
        20,
        y
    );

    y += 12;


    // ========================================================
    // SERVIÇOS
    // ========================================================

    pdf.text(
        "SERVIÇOS",
        20,
        y
    );

    y += 8;


    servicos.forEach(servico => {

        pdf.text(
            `• ${servico}`,
            25,
            y
        );

        y += 7;
    });


    y += 5;


    pdf.text(
        `Área aproximada: ${areaNumerica} m²`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Prazo desejado: ${prazo}`,
        20,
        y
    );

    y += 12;


    // ========================================================
    // ENDEREÇO
    // ========================================================

    pdf.text(
        "ENDEREÇO DA EMPRESA",
        20,
        y
    );

    y += 8;


    pdf.text(
        `CEP: ${cep}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Estado: ${estadoTexto}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Cidade: ${cidade}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Bairro: ${bairro}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Logradouro: ${logradouro}`,
        20,
        y
    );

    y += 7;


    pdf.text(
        `Número: ${numero}`,
        20,
        y
    );

    y += 7;


    if (complemento) {

        pdf.text(
            `Complemento: ${complemento}`,
            20,
            y
        );

        y += 7;
    }


    // ========================================================
    // SALVAR PDF
    // ========================================================

    const nomeArquivo =
        `orcamento-${razaoSocial
            .replace(/\s+/g, "-")
            .toLowerCase()}.pdf`;


    pdf.save(nomeArquivo);
}


// ============================================================
// WHATSAPP
// ============================================================

function enviarWhatsApp() {

    const razaoSocial =
        document.getElementById(
            "razaoSocial"
        ).value.trim();


    const nomeFantasia =
        document.getElementById(
            "nomeFantasia"
        ).value.trim();


    const cnpj =
        document.getElementById(
            "cnpj"
        ).value.trim();


    const email =
        document.getElementById(
            "email"
        ).value.trim();


    const telefone =
        document.getElementById(
            "telefone"
        ).value.trim();


    const responsavel =
        document.getElementById(
            "responsavel"
        ).value.trim();


    const area =
        document.getElementById(
            "area"
        ).value.trim();


    const prazo =
        obterPrazo();


    const cep =
        document.getElementById(
            "cep"
        ).value.trim();


    const estado =
        document.getElementById(
            "estado"
        );


    const estadoTexto =
        estado.options[
            estado.selectedIndex
        ]?.text || "";


    const cidade =
        document.getElementById(
            "cidade"
        ).value.trim();


    const bairro =
        document.getElementById(
            "bairro"
        ).value.trim();


    const logradouro =
        document.getElementById(
            "logradouro"
        ).value.trim();


    const numero =
        document.getElementById(
            "numero"
        ).value.trim();


    const complemento =
        document.getElementById(
            "complemento"
        ).value.trim();


    const servicos =
        obterServicos();


    // ========================================================
    // MENSAGEM
    // ========================================================

    const mensagem = `
Olá! Gostaria de solicitar um orçamento.

*DADOS DA EMPRESA*

Razão Social: ${razaoSocial}
Nome Fantasia: ${nomeFantasia}
CNPJ: ${cnpj}
E-mail: ${email}
Telefone: ${telefone}
Responsável: ${responsavel}

*SERVIÇOS*

${servicos
    .map(servico => `• ${servico}`)
    .join("\n")}

Área aproximada: ${area} m²
Prazo desejado: ${prazo}

*ENDEREÇO*

CEP: ${cep}
Estado: ${estadoTexto}
Cidade: ${cidade}
Bairro: ${bairro}
Logradouro: ${logradouro}
Número: ${numero}
Complemento: ${complemento}
    `.trim();


    const url =
        `https://wa.me/${NUMERO_WHATSAPP_EMPRESA}?text=${encodeURIComponent(
            mensagem
        )}`;


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
    () => {

        // ----------------------------------------------------
        // CARREGAR ESTADOS
        // ----------------------------------------------------

        estadosCarregamento =
            carregarEstados();


        // ----------------------------------------------------
        // CAMPOS
        // ----------------------------------------------------

        const campoCNPJ =
            document.getElementById(
                "cnpj"
            );


        const campoTelefone =
            document.getElementById(
                "telefone"
            );


        const campoCEP =
            document.getElementById(
                "cep"
            );


        const campoEstado =
            document.getElementById(
                "estado"
            );


        const campoOutro =
            document.getElementById(
                "servicoOutro"
            );


        const campoOutroTexto =
            document.getElementById(
                "servicoOutroTexto"
            );


        const formulario =
            document.getElementById(
                "formOrcamentoPJ"
            );


        const botaoWhatsApp =
            document.getElementById(
                "btnWhatsApp"
            );


        // ----------------------------------------------------
        // CNPJ
        // ----------------------------------------------------

        if (campoCNPJ) {

            campoCNPJ.addEventListener(
                "input",
                () => {

                    campoCNPJ.value =
                        aplicarMascaraCNPJ(
                            campoCNPJ.value
                        );
                }
            );
        }


        // ----------------------------------------------------
        // TELEFONE
        // ----------------------------------------------------

        if (campoTelefone) {

            campoTelefone.addEventListener(
                "input",
                () => {

                    campoTelefone.value =
                        aplicarMascaraTelefone(
                            campoTelefone.value
                        );
                }
            );
        }


        // ----------------------------------------------------
        // CEP
        // ----------------------------------------------------

        if (campoCEP) {

            campoCEP.addEventListener(
                "input",
                () => {

                    campoCEP.value =
                        aplicarMascaraCEP(
                            campoCEP.value
                        );

                    const cep =
                        somenteNumeros(
                            campoCEP.value
                        );

                    if (cep.length === 8) {
                        buscarCEP();
                    }
                }
            );


            campoCEP.addEventListener(
                "blur",
                buscarCEP
            );
        }


        // ----------------------------------------------------
        // ESTADO
        // ----------------------------------------------------

        if (campoEstado) {

            campoEstado.addEventListener(
                "change",
                () => {

                    const uf =
                        campoEstado.value;


                    const campoCidade =
                        document.getElementById(
                            "cidade"
                        );


                    if (uf) {

                        carregarCidades(
                            uf
                        );

                    } else {

                        campoCidade.innerHTML =
                            '<option value="">Cidade</option>';

                        campoCidade.disabled =
                            true;
                    }
                }
            );
        }


        // ----------------------------------------------------
        // OUTRO SERVIÇO
        // ----------------------------------------------------

        if (
            campoOutro &&
            campoOutroTexto
        ) {

            campoOutro.addEventListener(
                "change",
                () => {

                    if (campoOutro.checked) {

                        campoOutroTexto.disabled =
                            false;

                        campoOutroTexto.required =
                            true;

                        campoOutroTexto.focus();

                    } else {

                        campoOutroTexto.value =
                            "";

                        campoOutroTexto.disabled =
                            true;

                        campoOutroTexto.required =
                            false;
                    }
                }
            );
        }


        // ----------------------------------------------------
        // FORMULÁRIO
        // ----------------------------------------------------

        if (formulario) {

            formulario.addEventListener(
                "submit",
                gerarPDF
            );
        }


        // ----------------------------------------------------
        // WHATSAPP
        // ----------------------------------------------------

        if (botaoWhatsApp) {

            botaoWhatsApp.addEventListener(
                "click",
                enviarWhatsApp
            );
        }

    }
);