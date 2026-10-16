// ============================================================
// FORMULÁRIO DE ORÇAMENTO (CPF) - SABINO GESSO
// - Máscaras de CPF, telefone e CEP
// - Estados e cidades pela API do IBGE
// - Endereço automático pelo CEP (ViaCEP)
// - Envio ao servidor, geração de PDF e WhatsApp
// ============================================================

(function () {
    "use strict";

    // ---------- CONFIGURAÇÃO (ajuste antes de publicar) ----------

    // URL do servidor. Em produção, use o domínio da API (https).
    const API_URL = "http://localhost:3000/api/orcamentos";

    // WhatsApp da empresa: código do país + DDD + número, só dígitos.
    const WHATSAPP_NUMERO = "5547900000000";

    const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades";
    const VIACEP_URL = "https://viacep.com.br/ws";

    const UFS = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT",
        "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
        "RR", "SC", "SP", "SE", "TO"
    ];

    // ---------- ELEMENTOS ----------

    const $ = id => document.getElementById(id);

    const form = $("formOrcamentoPF");
    const inputCpf = $("cpf");
    const inputTelefone = $("telefone");
    const inputCep = $("cep");
    const selEstado = $("estado");
    const selCidade = $("cidade");
    const inputBairro = $("bairro");
    const inputLogradouro = $("logradouro");
    const inputNumero = $("numero");
    const chkOutro = $("servicoOutro");
    const inputOutro = $("servicoOutroTexto");
    const cepStatus = $("cepStatus");
    const btnEnviar = $("btnEnviar");

    // ---------- UTILITÁRIOS ----------

    const soDigitos = v => String(v || "").replace(/\D/g, "");

    function normalizar(txt) {
        return String(txt || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function mascaraCPF(v) {
        return soDigitos(v).slice(0, 11)
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    function mascaraTelefone(v) {
        v = soDigitos(v).slice(0, 11);

        if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
        if (v.length > 2) return v.replace(/(\d{2})(\d{0,5})/, "($1) $2");

        return v;
    }

    function mascaraCEP(v) {
        v = soDigitos(v).slice(0, 8);
        return v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v;
    }

    function validarCPF(cpf) {
        cpf = soDigitos(cpf);

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

        for (let t = 9; t < 11; t++) {
            let soma = 0;

            for (let i = 0; i < t; i++) {
                soma += Number(cpf[i]) * (t + 1 - i);
            }

            if (((soma * 10) % 11) % 10 !== Number(cpf[t])) return false;
        }

        return true;
    }

    function validarTelefone(numeros) {
        if (numeros.length !== 10 && numeros.length !== 11) return false;
        if (!/^[1-9][1-9]/.test(numeros)) return false;

        return numeros.length === 11
            ? numeros[2] === "9"
            : /^[2-9]/.test(numeros[2]);
    }

    function preencherSelect(select, placeholder, itens) {
        select.innerHTML = "";

        const base = document.createElement("option");
        base.value = "";
        base.textContent = placeholder;
        select.appendChild(base);

        itens.forEach(function (item) {
            const op = document.createElement("option");
            op.value = item.valor;
            op.textContent = item.texto;
            select.appendChild(op);
        });
    }

    function mostrarStatusCep(mensagem, tipo) {
        cepStatus.textContent = mensagem;
        cepStatus.className = "d-block mb-2 " + (
            tipo === "ok" ? "text-success" :
            tipo === "erro" ? "text-danger" :
            "text-muted"
        );
    }

    // ---------- MÁSCARAS ----------

    inputCpf.addEventListener("input", function () {
        inputCpf.value = mascaraCPF(inputCpf.value);
    });

    inputTelefone.addEventListener("input", function () {
        inputTelefone.value = mascaraTelefone(inputTelefone.value);
    });

    inputCep.addEventListener("input", function () {
        inputCep.value = mascaraCEP(inputCep.value);

        if (soDigitos(inputCep.value).length === 8) {
            buscarCep();
        } else {
            ultimoCep = "";
            mostrarStatusCep("", "info");
        }
    });

    // ---------- OUTRO SERVIÇO ----------

    function atualizarOutro() {
        inputOutro.disabled = !chkOutro.checked;
        inputOutro.required = chkOutro.checked;

        if (!chkOutro.checked) inputOutro.value = "";
    }

    chkOutro.addEventListener("change", atualizarOutro);

    // ---------- ESTADOS E CIDADES (IBGE) ----------

    async function carregarEstados() {
        try {
            const resp = await fetch(IBGE_URL + "/estados?orderBy=nome");

            if (!resp.ok) throw new Error("IBGE indisponível");

            const lista = await resp.json();

            preencherSelect(
                selEstado,
                "Estado",
                lista.map(e => ({ valor: e.sigla, texto: e.nome }))
            );

        } catch (erro) {
            // Plano B: só as siglas, para o formulário continuar funcionando.
            preencherSelect(
                selEstado,
                "Estado",
                UFS.map(uf => ({ valor: uf, texto: uf }))
            );
        }
    }

    let tokenCidades = 0;

    async function carregarCidades(uf, cidadeSelecionada) {
        const meuToken = ++tokenCidades;

        if (!uf) {
            preencherSelect(selCidade, "Selecione a cidade", []);
            selCidade.disabled = true;
            return;
        }

        selCidade.disabled = true;
        preencherSelect(selCidade, "Carregando cidades...", []);

        try {
            const resp = await fetch(
                IBGE_URL + "/estados/" + uf + "/municipios?orderBy=nome"
            );

            if (!resp.ok) throw new Error("IBGE indisponível");

            const lista = await resp.json();

            // Ignora resposta antiga se o usuário já trocou de estado.
            if (meuToken !== tokenCidades) return;

            preencherSelect(
                selCidade,
                "Selecione a cidade",
                lista.map(c => ({ valor: c.nome, texto: c.nome }))
            );

            selCidade.disabled = false;

            if (cidadeSelecionada) {
                const alvo = normalizar(cidadeSelecionada);
                const opcao = Array.from(selCidade.options)
                    .find(o => normalizar(o.value) === alvo);

                if (opcao) selCidade.value = opcao.value;
            }

        } catch (erro) {
            if (meuToken !== tokenCidades) return;

            // Plano B: mantém ao menos a cidade que veio do CEP.
            preencherSelect(
                selCidade,
                "Não foi possível carregar as cidades",
                cidadeSelecionada
                    ? [{ valor: cidadeSelecionada, texto: cidadeSelecionada }]
                    : []
            );

            if (cidadeSelecionada) selCidade.value = cidadeSelecionada;

            selCidade.disabled = !cidadeSelecionada;
        }
    }

    selEstado.addEventListener("change", function () {
        carregarCidades(selEstado.value);
    });

    // ---------- BUSCA POR CEP (ViaCEP) ----------

    let ultimoCep = "";
    let tokenCep = 0;
    let estadosPronto = Promise.resolve();

    async function buscarCep() {
        const cep = soDigitos(inputCep.value);

        if (cep.length !== 8 || cep === ultimoCep) return;

        ultimoCep = cep;

        const meuToken = ++tokenCep;

        mostrarStatusCep("Buscando endereço...", "info");

        try {
            const resp = await fetch(VIACEP_URL + "/" + cep + "/json/");

            if (!resp.ok) throw new Error("ViaCEP indisponível");

            const dados = await resp.json();

            if (meuToken !== tokenCep) return;

            if (dados.erro) {
                ultimoCep = "";
                mostrarStatusCep(
                    "CEP não encontrado. Preencha o endereço manualmente.",
                    "erro"
                );
                return;
            }

            // Garante que a lista de estados já carregou antes de selecionar.
            await estadosPronto;

            if (meuToken !== tokenCep) return;

            selEstado.value = dados.uf;

            await carregarCidades(dados.uf, dados.localidade);

            if (meuToken !== tokenCep) return;

            inputBairro.value = dados.bairro || "";
            inputLogradouro.value = dados.logradouro || "";

            mostrarStatusCep(
                "Endereço preenchido. Confira e informe o número.",
                "ok"
            );

            inputNumero.focus();

        } catch (erro) {
            if (meuToken !== tokenCep) return;

            ultimoCep = "";
            mostrarStatusCep(
                "Não foi possível buscar o CEP. Preencha manualmente.",
                "erro"
            );
        }
    }

    // ---------- DADOS E VALIDAÇÃO ----------

    function coletarDados() {
        const servicos = Array.from(
            form.querySelectorAll('input[name="servicos"]:checked')
        ).map(i => i.value);

        const prazo = form.querySelector('input[name="prazo"]:checked');

        return {
            nome: $("nome").value.trim(),
            cpf: inputCpf.value.trim(),
            email: $("email").value.trim(),
            telefone: inputTelefone.value.trim(),
            servicos: servicos,
            outroDescricao: servicos.includes("Outro")
                ? inputOutro.value.trim()
                : "",
            area: Number($("area").value),
            prazo: prazo ? prazo.value : "",
            cep: inputCep.value.trim(),
            estado: selEstado.value,
            cidade: selCidade.value,
            bairro: inputBairro.value.trim(),
            logradouro: inputLogradouro.value.trim(),
            numero: inputNumero.value.trim(),
            complemento: $("complemento").value.trim(),
            observacoes: $("observacoes").value.trim()
        };
    }

    function validar() {
        const dados = coletarDados();

        if (dados.servicos.length === 0) {
            alert("Selecione pelo menos um serviço.");
            return false;
        }

        if (!form.reportValidity()) return false;

        if (!validarCPF(dados.cpf)) {
            alert("CPF inválido.");
            inputCpf.focus();
            return false;
        }

        if (!validarTelefone(soDigitos(dados.telefone))) {
            alert("Telefone inválido. Informe o DDD e o número.");
            inputTelefone.focus();
            return false;
        }

        return true;
    }

    // ---------- PDF ----------

    function gerarPDF(d, codigo) {
        if (!window.jspdf) {
            alert("Não foi possível carregar o gerador de PDF.");
            return;
        }

        const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });

        const margem = 20;
        const largura = 170;
        let y = 20;

        function novaPaginaSeNecessario(altura) {
            if (y + altura > 280) {
                doc.addPage();
                y = 20;
            }
        }

        function titulo(texto) {
            novaPaginaSeNecessario(12);
            y += 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text(texto, margem, y);
            y += 3;
            doc.setDrawColor(150);
            doc.line(margem, y, margem + largura, y);
            y += 6;
        }

        function linha(rotulo, valor) {
            const texto = String(valor || "-");

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            const rot = rotulo + ": ";
            const larguraRotulo = doc.getTextWidth(rot);

            doc.setFont("helvetica", "normal");
            const partes = doc.splitTextToSize(texto, largura - larguraRotulo);

            novaPaginaSeNecessario(partes.length * 6);

            doc.setFont("helvetica", "bold");
            doc.text(rot, margem, y);

            doc.setFont("helvetica", "normal");
            doc.text(partes, margem + larguraRotulo, y);

            y += partes.length * 6;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Sabino Gesso", margem, y);
        y += 8;

        doc.setFontSize(13);
        doc.setFont("helvetica", "normal");
        doc.text("Solicitação de orçamento - Pessoa Física", margem, y);
        y += 6;

        doc.setFontSize(10);
        doc.text(
            (codigo ? "Código: " + codigo + "   |   " : "") +
            "Data: " + new Date().toLocaleDateString("pt-BR"),
            margem,
            y
        );
        y += 4;

        titulo("Dados do cliente");
        linha("Nome", d.nome);
        linha("CPF", d.cpf);
        linha("E-mail", d.email);
        linha("Telefone", d.telefone);

        const servicos = d.servicos.map(s =>
            s === "Outro" && d.outroDescricao ? "Outro: " + d.outroDescricao : s
        ).join(", ");

        titulo("Sobre o serviço");
        linha("Serviços", servicos);
        linha("Área aproximada", d.area ? d.area + " m²" : "");
        linha("Prazo", d.prazo);

        titulo("Endereço do orçamento");
        linha("CEP", d.cep);
        linha("Estado", d.estado);
        linha("Cidade", d.cidade);
        linha("Bairro", d.bairro);
        linha("Logradouro", d.logradouro + ", " + d.numero);
        linha("Complemento", d.complemento);

        if (d.observacoes) {
            titulo("Observações");
            linha("Texto", d.observacoes);
        }

        doc.save("orcamento-" + (codigo || "rascunho") + ".pdf");
    }

    $("btnGerarPDF").addEventListener("click", function (e) {
        e.preventDefault();

        if (!validar()) return;

        gerarPDF(coletarDados(), null);
    });

    // ---------- ENVIO AO SERVIDOR ----------

    function limparFormulario() {
        form.reset();
        ultimoCep = "";
        mostrarStatusCep("", "info");
        atualizarOutro();
        carregarCidades("");
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!validar()) return;

        const dados = coletarDados();

        btnEnviar.disabled = true;
        const textoOriginal = btnEnviar.textContent;
        btnEnviar.textContent = "Enviando...";

        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });

            const resultado = await resp.json().catch(() => ({}));

            if (!resp.ok) {
                throw new Error(
                    resultado.erro || "Erro ao enviar o orçamento."
                );
            }

            gerarPDF(dados, resultado.codigo);

            alert(
                "Orçamento enviado com sucesso!\n" +
                "Código: " + resultado.codigo
            );

            limparFormulario();

        } catch (erro) {
            alert(
                erro instanceof TypeError
                    ? "Não foi possível conectar ao servidor. " +
                      "Verifique sua internet e tente novamente."
                    : erro.message
            );

        } finally {
            btnEnviar.disabled = false;
            btnEnviar.textContent = textoOriginal;
        }
    });

    // ---------- WHATSAPP ----------

    $("btnWhatsApp").addEventListener("click", function () {
        if (!validar()) return;

        const d = coletarDados();

        const servicos = d.servicos.map(s =>
            s === "Outro" && d.outroDescricao ? d.outroDescricao : s
        ).join(", ");

        const texto = [
            "Olá! Gostaria de um orçamento.",
            "",
            "Nome: " + d.nome,
            "Serviços: " + servicos,
            "Área aproximada: " + d.area + " m²",
            "Prazo: " + d.prazo,
            "Endereço: " + d.logradouro + ", " + d.numero +
                (d.complemento ? " - " + d.complemento : "") +
                ", " + d.bairro + ", " + d.cidade + "/" + d.estado +
                " - CEP " + d.cep
        ].join("\n");

        window.open(
            "https://wa.me/" + WHATSAPP_NUMERO +
            "?text=" + encodeURIComponent(texto),
            "_blank",
            "noopener"
        );
    });

    // ---------- INICIALIZAÇÃO ----------

    atualizarOutro();
    estadosPronto = carregarEstados();

})();