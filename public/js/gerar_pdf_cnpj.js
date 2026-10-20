// ============================================================
// FORMULÁRIO CNPJ - SABINO GESSO
// Máscaras, CEP, estados/cidades, envio ao banco, PDF e WhatsApp
// ============================================================

// >>> Use os MESMOS valores que estão no gerar_pdf_cpf.js <<<
const API_URL = "http://localhost:3000";
const WHATSAPP_NUMERO = "55SEUNUMEROAQUI"; // ex.: 5547999999999

document.addEventListener("DOMContentLoaded", function () {

    const $ = id => document.getElementById(id);

    const form = $("formOrcamentoPJ");
    if (!form) return;

    const campoCep = $("cep");
    const selEstado = $("estado");
    const selCidade = $("cidade");
    const cepStatus = $("cepStatus");

    // --------------------------------------------------------
    // UTILITÁRIOS
    // --------------------------------------------------------

    const soDigitos = v => String(v || "").replace(/\D/g, "");

    const normalizar = t =>
        String(t || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    function mostrarCep(msg, erro) {
        if (!cepStatus) return;
        cepStatus.textContent = msg || "";
        cepStatus.style.color = erro ? "#c0392b" : "#555";
    }

    // --------------------------------------------------------
    // MÁSCARAS
    // --------------------------------------------------------

    $("cnpj").addEventListener("input", function () {
        const d = soDigitos(this.value).slice(0, 14);
        this.value = d
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    });

    $("telefone").addEventListener("input", function () {
        const d = soDigitos(this.value).slice(0, 11);
        if (d.length <= 2) this.value = d ? "(" + d : "";
        else if (d.length <= 6) this.value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
        else if (d.length <= 10)
            this.value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        else
            this.value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    });

    campoCep.addEventListener("input", function () {
        const d = soDigitos(this.value).slice(0, 8);
        this.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
    });

    // --------------------------------------------------------
    // VALIDAÇÕES (espelham as do servidor)
    // --------------------------------------------------------

    function validarCNPJ(valor) {
        const c = soDigitos(valor);
        if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;

        const digito = base => {
            const pesos = base.length === 12
                ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
                : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            const soma = [...base].reduce(
                (t, d, i) => t + Number(d) * pesos[i], 0);
            const r = soma % 11;
            return r < 2 ? 0 : 11 - r;
        };

        const d1 = digito(c.slice(0, 12));
        const d2 = digito(c.slice(0, 12) + d1);
        return c === c.slice(0, 12) + d1 + d2;
    }

    function validarTelefone(n) {
        if (n.length !== 10 && n.length !== 11) return false;
        if (!/^[1-9][1-9]/.test(n)) return false;
        return n.length === 11 ? n[2] === "9" : /^[2-9]/.test(n[2]);
    }

    // --------------------------------------------------------
    // ESTADOS E CIDADES (IBGE)
    // --------------------------------------------------------

    async function carregarEstados() {
        try {
            const r = await fetch(
                "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
            const estados = await r.json();

            selEstado.innerHTML = '<option value="">Estado</option>';
            estados.forEach(e => {
                const o = document.createElement("option");
                o.value = e.sigla;
                o.textContent = e.nome;
                selEstado.appendChild(o);
            });
        } catch (e) {
            selEstado.innerHTML =
                '<option value="">Erro ao carregar estados</option>';
        }
    }

    async function carregarCidades(uf, cidadeSelecionar) {
        selCidade.disabled = true;
        selCidade.innerHTML = '<option value="">Carregando...</option>';

        if (!uf) {
            selCidade.innerHTML = '<option value="">Cidade</option>';
            return;
        }

        try {
            const r = await fetch(
                `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
            const cidades = await r.json();

            selCidade.innerHTML = '<option value="">Cidade</option>';
            cidades.forEach(c => {
                const o = document.createElement("option");
                o.value = c.nome;
                o.textContent = c.nome;
                selCidade.appendChild(o);
            });

            selCidade.disabled = false;

            if (cidadeSelecionar) {
                const alvo = normalizar(cidadeSelecionar);
                const achada = [...selCidade.options]
                    .find(o => normalizar(o.value) === alvo);
                if (achada) selCidade.value = achada.value;
            }
        } catch (e) {
            selCidade.innerHTML =
                '<option value="">Erro ao carregar cidades</option>';
        }
    }

    selEstado.addEventListener("change", () =>
        carregarCidades(selEstado.value));

    // --------------------------------------------------------
    // CEP (ViaCEP)
    // --------------------------------------------------------

    campoCep.addEventListener("blur", async function () {
        const cep = soDigitos(this.value);
        if (cep.length === 0) return mostrarCep("");
        if (cep.length !== 8) return mostrarCep("CEP incompleto.", true);

        mostrarCep("Buscando CEP...");

        try {
            const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const d = await r.json();

            if (d.erro) return mostrarCep("CEP não encontrado.", true);

            selEstado.value = d.uf;
            await carregarCidades(d.uf, d.localidade);
            if (d.bairro) $("bairro").value = d.bairro;
            if (d.logradouro) $("logradouro").value = d.logradouro;

            mostrarCep("Endereço preenchido pelo CEP.");
            $("numero").focus();
        } catch (e) {
            mostrarCep("Não foi possível buscar o CEP.", true);
        }
    });

    // --------------------------------------------------------
    // CAMPO "OUTRO"
    // --------------------------------------------------------

    const chkOutro = $("servicoOutro");
    const txtOutro = $("servicoOutroTexto");

    chkOutro.addEventListener("change", function () {
        txtOutro.disabled = !this.checked;
        if (this.checked) txtOutro.focus();
        else txtOutro.value = "";
    });

    // --------------------------------------------------------
    // COLETA DOS DADOS
    // --------------------------------------------------------

    function coletarDados() {
        const prazo = form.querySelector('input[name="prazo"]:checked');

        return {
            razaoSocial: $("razaoSocial").value.trim(),
            nomeFantasia: $("nomeFantasia").value.trim(),
            cnpj: soDigitos($("cnpj").value),
            email: $("email").value.trim(),
            telefone: soDigitos($("telefone").value),
            responsavel: $("responsavel").value.trim(),
            servicos: [...form.querySelectorAll('input[name="servicos"]:checked')]
                .map(c => c.value),
            outroDescricao: txtOutro.value.trim(),
            area: Number($("area").value),
            prazo: prazo ? prazo.value : "",
            cep: soDigitos($("cep").value),
            estado: selEstado.value,
            cidade: selCidade.value,
            bairro: $("bairro").value.trim(),
            logradouro: $("logradouro").value.trim(),
            numero: $("numero").value.trim(),
            complemento: $("complemento").value.trim(),
            observacoes: $("observacoes").value.trim()
        };
    }

    function validar(d) {
        if (!validarCNPJ(d.cnpj)) return "CNPJ inválido.";
        if (!validarTelefone(d.telefone)) return "Telefone inválido.";
        if (d.servicos.length === 0) return "Selecione pelo menos um serviço.";
        if (d.servicos.includes("Outro") && !d.outroDescricao)
            return "Descreva o outro serviço.";
        if (!(d.area > 0)) return "Informe a área.";
        if (!d.prazo) return "Selecione o prazo desejado.";
        if (d.cep.length !== 8) return "CEP inválido.";
        if (!d.estado || !d.cidade) return "Selecione estado e cidade.";
        if (d.complemento.length > 150)
            return "Complemento: máximo de 150 caracteres.";
        return null;
    }

    // --------------------------------------------------------
    // ENVIO AO BANCO
    // --------------------------------------------------------

    form.addEventListener("submit", async function (ev) {
        ev.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const dados = coletarDados();
        const erro = validar(dados);
        if (erro) return alert(erro);

        const btn = form.querySelector(".btn-enviar[type='submit']");
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Enviando...";

        try {
            const r = await fetch(`${API_URL}/api/orcamentos/pj`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });

            const resp = await r.json().catch(() => ({}));

            if (!r.ok) {
                throw new Error(resp.erro || "Erro ao enviar o orçamento.");
            }

            // Gera o PDF antes de limpar o formulário
            let avisoPdf = "";

            try {
                gerarPDF(dados, resp.codigo);
            } catch (erroPdf) {
                console.error("Erro ao gerar PDF:", erroPdf);
                avisoPdf = "\n(Não foi possível gerar o PDF.)";
            }

            alert(
                `Orçamento enviado com sucesso!\nCódigo: ${resp.codigo}` +
                avisoPdf);

            form.reset();
            txtOutro.disabled = true;
            selCidade.disabled = true;
            selCidade.innerHTML = '<option value="">Cidade</option>';
            mostrarCep("");

        } catch (e) {
            alert(e.message || "Não foi possível conectar ao servidor.");
        } finally {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    });

    // --------------------------------------------------------
    // PDF
    // --------------------------------------------------------

    function listaServicos(d) {
        return d.servicos
            .map(s => s === "Outro" ? `Outro: ${d.outroDescricao}` : s)
            .join(", ");
    }

    function gerarPDF(d, codigo) {
        if (!window.jspdf) {
            throw new Error("Biblioteca de PDF não carregada.");
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();

        let y = 20;
        const linha = (rotulo, valor) => {
            const txt = pdf.splitTextToSize(`${rotulo}: ${valor || "-"}`, 175);
            if (y + txt.length * 7 > 280) { pdf.addPage(); y = 20; }
            pdf.text(txt, 15, y);
            y += txt.length * 7;
        };

        pdf.setFontSize(18);
        pdf.text("Orçamento - Pessoa Jurídica", 15, y);
        y += 6;
        pdf.setFontSize(11);
        pdf.text("Sabino Gesso", 15, y + 4);
        y += 16;

        if (codigo) linha("Código do orçamento", codigo);
        linha("Data", new Date().toLocaleDateString("pt-BR"));
        y += 4;

        linha("Razão social", d.razaoSocial);
        linha("Nome fantasia", d.nomeFantasia);
        linha("CNPJ", $("cnpj").value);
        linha("E-mail", d.email);
        linha("Telefone", $("telefone").value);
        linha("Responsável", d.responsavel);
        y += 4;
        linha("Serviços", listaServicos(d));
        linha("Área aproximada", d.area ? `${d.area} m²` : "");
        linha("Prazo", d.prazo);
        y += 4;
        linha("CEP", $("cep").value);
        linha("Estado / Cidade", `${d.estado} / ${d.cidade}`);
        linha("Bairro", d.bairro);
        linha("Endereço", `${d.logradouro}, ${d.numero}`);
        linha("Complemento", d.complemento);
        linha("Observações", d.observacoes);

        pdf.save(
            codigo ? `orcamento-${codigo}.pdf` : "orcamento-cnpj.pdf");
    }

    // Botão da navbar: gera o PDF com o que já está preenchido
    $("btnGerarPDF").addEventListener("click", function (ev) {
        ev.preventDefault();

        try {
            gerarPDF(coletarDados(), null);
        } catch (e) {
            alert(e.message);
        }
    });

    // --------------------------------------------------------
    // WHATSAPP
    // --------------------------------------------------------

    $("btnWhatsApp").addEventListener("click", function () {
        const d = coletarDados();

        const msg =
            "Olá! Gostaria de um orçamento (Pessoa Jurídica).\n\n" +
            `*Empresa:* ${d.razaoSocial || "-"}\n` +
            `*Fantasia:* ${d.nomeFantasia || "-"}\n` +
            `*CNPJ:* ${$("cnpj").value || "-"}\n` +
            `*Responsável:* ${d.responsavel || "-"}\n` +
            `*Telefone:* ${$("telefone").value || "-"}\n` +
            `*Serviços:* ${listaServicos(d) || "-"}\n` +
            `*Área:* ${d.area ? d.area + " m²" : "-"}\n` +
            `*Prazo:* ${d.prazo || "-"}\n` +
            `*Local:* ${[d.logradouro, d.numero, d.bairro, d.cidade, d.estado]
                .filter(Boolean).join(", ") || "-"}` +
            (d.observacoes ? `\n*Obs.:* ${d.observacoes}` : "");

        window.open(
            `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`,
            "_blank");
    });

    // --------------------------------------------------------
    carregarEstados();
});