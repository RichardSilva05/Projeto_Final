// ============================================================
// PREÇOS E VISITA TÉCNICA - SABINO GESSO
// Usado pelos formulários CPF e CNPJ (carregue ANTES do script
// do formulário):
//
//   <script src="../js/precos_orcamento.js"></script>
//   <script src="../js/gerar_pdf_cpf.js"></script>
//
// O que faz:
//  - busca no servidor o preço do m² de cada serviço
//  - mostra o preço ao lado de cada serviço
//  - calcula  área x preço do m²  e mostra o valor estimado
//  - acrescenta a pergunta "Deseja visita técnica no local?"
//
// O valor é só uma ESTIMATIVA para o cliente. O servidor
// recalcula tudo e grava o valor dele no banco.
// ============================================================

(function () {
    "use strict";

    // Mesmo endereço do servidor usado nos formulários
    const SERVIDOR = "http://localhost:3000";

    const precos = {};        // nome do serviço -> preço do m² (ou null)
    let carregou = false;
    let falhou = false;

    // ---------- utilitários ----------

    const $ = id => document.getElementById(id);

    function moeda(valor) {
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function obterForm() {
        return $("formOrcamentoPF") || $("formOrcamentoPJ");
    }

    // ---------- cálculo ----------

    function calcular() {
        const form = obterForm();
        const area = Number($("area").value);
        const areaOk = Number.isFinite(area) && area > 0;

        const itens = [];
        const semPreco = [];
        let centavos = 0;

        form.querySelectorAll('input[name="servicos"]:checked')
            .forEach(function (chk) {
                const nome = chk.value;
                const preco = precos[nome];

                // Sem preço cadastrado (ex.: "Outro") = sob consulta
                if (preco === null || preco === undefined) {
                    semPreco.push(nome);
                    return;
                }

                // Mesma conta do servidor: arredonda em centavos
                const subtotal = areaOk
                    ? Math.round(area * preco * 100)
                    : 0;

                centavos += subtotal;

                itens.push({
                    nome: nome,
                    preco: preco,
                    subtotal: subtotal / 100
                });
            });

        return {
            area: area,
            areaOk: areaOk,
            itens: itens,
            semPreco: semPreco,
            total: centavos / 100
        };
    }

    // ---------- tela: resumo do valor ----------

    function linha(pai, texto, classe) {
        const p = document.createElement("p");

        p.className = classe || "mb-1";
        p.textContent = texto;

        pai.appendChild(p);
    }

    function atualizarResumo() {
        const caixa = $("resumoValor");

        if (!caixa) return;

        caixa.innerHTML = "";

        const titulo = document.createElement("strong");
        titulo.className = "d-block mb-2";
        titulo.textContent = "Valor estimado";
        caixa.appendChild(titulo);

        if (falhou) {
            linha(
                caixa,
                "Não foi possível carregar os valores agora. " +
                "Você pode enviar o orçamento normalmente; " +
                "o valor será informado depois.",
                "mb-0 text-muted"
            );
            return;
        }

        if (!carregou) {
            linha(caixa, "Carregando valores...", "mb-0 text-muted");
            return;
        }

        const c = calcular();

        if (c.itens.length === 0 && c.semPreco.length === 0) {
            linha(
                caixa,
                "Selecione os serviços e informe a área (m²) " +
                "para ver o valor estimado.",
                "mb-0 text-muted"
            );
            return;
        }

        if (!c.areaOk) {
            c.itens.forEach(function (item) {
                linha(caixa, item.nome + ": " + moeda(item.preco) + " por m²");
            });

            linha(
                caixa,
                "Informe a área (m²) para calcular o valor.",
                "mb-0 text-muted"
            );
            return;
        }

        c.itens.forEach(function (item) {
            linha(
                caixa,
                item.nome + ": " +
                c.area.toLocaleString("pt-BR") + " m² x " +
                moeda(item.preco) + " = " + moeda(item.subtotal)
            );
        });

        c.semPreco.forEach(function (nome) {
            linha(caixa, nome + ": valor sob consulta", "mb-1 text-muted");
        });

        if (c.itens.length > 0) {
            linha(caixa, "Total estimado: " + moeda(c.total), "fs-5 fw-bold mb-1");
        }

        linha(
            caixa,
            "Valor aproximado. O valor final é confirmado após a análise " +
            "do seu pedido.",
            "mb-0 small text-muted"
        );
    }

    // ---------- tela: preço ao lado de cada serviço ----------

    function marcarPrecosNosServicos() {
        obterForm()
            .querySelectorAll('input[name="servicos"]')
            .forEach(function (chk) {
                const preco = precos[chk.value];

                if (preco === null || preco === undefined) return;

                const rotulo = document.querySelector(
                    'label[for="' + chk.id + '"]'
                );

                if (!rotulo || rotulo.querySelector(".preco-m2")) return;

                const small = document.createElement("small");

                small.className = "preco-m2 text-muted ms-1";
                small.textContent = "(" + moeda(preco) + "/m²)";

                rotulo.appendChild(small);
            });
    }

    // ---------- tela: blocos novos do formulário ----------

    function montarBlocos(form) {
        const botoes = form.querySelector(".botoes-acoes");

        // Caixa do valor estimado: logo abaixo de área / prazo
        const caixa = document.createElement("div");

        caixa.id = "resumoValor";
        caixa.className = "border rounded p-3 mb-3";
        caixa.setAttribute("aria-live", "polite");

        const linhaArea = $("area").closest(".row-endereco");

        if (linhaArea) {
            linhaArea.insertAdjacentElement("afterend", caixa);
        } else {
            form.insertBefore(caixa, botoes);
        }

        // Pergunta da visita técnica: antes dos botões
        const visita = document.createElement("div");

        visita.id = "blocoVisita";
        visita.innerHTML =
            '<h2><i class="bi bi-geo-alt-fill"></i> Visita no local:</h2>' +
            '<span class="rotulo-pequeno">' +
            'Deseja que façamos uma visita técnica no local?</span>' +
            '<div class="d-flex flex-wrap mb-3">' +
            '<div class="form-check-pill">' +
            '<input class="form-check-input" type="radio" name="visita" ' +
            'id="visitaSim" value="Sim" required>' +
            '<label for="visitaSim">Sim, quero a visita</label></div>' +
            '<div class="form-check-pill">' +
            '<input class="form-check-input" type="radio" name="visita" ' +
            'id="visitaNao" value="Não">' +
            '<label for="visitaNao">Não preciso</label></div>' +
            "</div>";

        form.insertBefore(visita, botoes);
    }

    // ---------- servidor ----------

    async function carregarPrecos() {
        try {
            const resp = await fetch(SERVIDOR + "/api/servicos");

            if (!resp.ok) throw new Error("falha ao buscar serviços");

            const lista = await resp.json();

            lista.forEach(function (s) {
                precos[s.nome] = s.precoM2;
            });

            carregou = true;
            marcarPrecosNosServicos();

        } catch (erro) {
            falhou = true;
        }

        atualizarResumo();
    }

    // ---------- API para os scripts dos formulários ----------

    window.PrecosOrcamento = {

        // Dados para enviar e para o PDF / WhatsApp
        dados: function () {
            const marcada = document.querySelector(
                'input[name="visita"]:checked'
            );

            const c = calcular();

            return {
                visitaTecnica: marcada ? marcada.value === "Sim" : null,
                valorEstimado: c.total,
                temValor: c.total > 0,
                sobConsulta: c.semPreco.length > 0
            };
        },

        // Ex.: "R$ 1.700,00 (estimativa) + outro serviço sob consulta"
        textoValor: function () {
            const d = this.dados();

            if (!d.temValor) return "A combinar";

            return moeda(d.valorEstimado) + " (estimativa)" +
                (d.sobConsulta ? " + outro serviço sob consulta" : "");
        },

        formatarMoeda: moeda
    };

    // ---------- início ----------

    function iniciar() {
        const form = obterForm();

        if (!form || !$("area")) return;

        montarBlocos(form);

        form.addEventListener("change", function (e) {
            if (e.target.name === "servicos") atualizarResumo();
        });

        $("area").addEventListener("input", atualizarResumo);

        // Depois de limpar o formulário, atualiza o resumo
        form.addEventListener("reset", function () {
            setTimeout(atualizarResumo, 0);
        });

        atualizarResumo();
        carregarPrecos();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

})();