<?php
$titulo = "Aprendendo Bootstrap no UNISENAI";
$empresa = "Sabino Gesso";
?>
<!doctype html>
<html lang="pt-br">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo $titulo; ?></title>

  <!-- Bootstrap -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">

  <!-- Bootstrap Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">

  <!-- CSS -->
  <link rel="stylesheet" href="stayle.css">

  <style>
    body {
      padding-top: 90px;
    }
  </style>
</head>

<body>

<!-- Navbar -->
<nav class="navbar navbar-expand-lg navbar-dark fixed-top ">
  <div class="container-fluid">

    <a class="navbar-brand" href="#">
      <img src="logo.png" alt="Logo" class="logo">
    </a>

    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="menu">
      <ul class="navbar-nav ms-auto align-items-lg-center">

        <li class="nav-item ms-lg-3 display-4 menu">
          <a class="nav-link text-black fs-4 " href="#inicio">Inicio</a>
        </li>

        <li class="nav-item ms-lg-3 display-4 menu">
          <a class="nav-link text-black fs-4 " href="#sobrenos">Sobre Nós</a>
        </li>

        <li class="nav-item ms-lg-3 display-4 menu">
          <a class="nav-link text-black fs-4 " href="#valores">Missão</a>
        </li>

        <li class="nav-item ms-lg-3 display-4 menu">
          <a class="nav-link text-black fs-4  " href="#parcerias">Parcerias</a>
        </li>

        <li class="nav-item ms-lg-3">
          <button class="btn-orcamento text-red">
            <a href="#formulario">Fazer Orçamento</a>
          </button>
        </li>

      </ul>
    </div>

  </div>
</nav>

<!-- Início -->
<section id="inicio" class="section py-5 mt-5">
  <div class="container">

    <h1 class="display-4 espaço">Transformando espaços</h1>

    <h2 class="display-4 fs-3">
      Em obras de arte precisão no detalhe,<br>
      excelência em gesso.
    </h2>

    <div class="conteudo-proposito mt-4 display-4 fs-5">

      <p class="sobre display-4 fs-5">
        Nosso objetivo é elevar cada ambiente com qualidade,
        sofisticação e acabamento impecável,
        transformando ideias em realidade através do gesso.
      </p>

      <img src="prediogesso.jpg"
           alt="Imagem de gesso"
           class="img-fluid prediogesso"
           width="180">

    </div>

    <button class="btn-orcamento_segundo">
      <a href="#formulario">Fazer Orçamento</a>
    </button>

  </div>
</section>

<hr class="esquerda">
<hr class="esquerda-2">

<!-- Sobre -->
<section id="sobrenos" class="sobrenos">
  <div class="container">

    <h1 class="display-4 esquerda espaço">Quem somos:</h1>

    <div class="conteudo-proposito mt-4">

      <img src="logo.png"
           alt="Logo sobre"
           class="img-fluid rounded-circle logosobre"
           width="180">

      <p class="esquerda display-4 fs-5">
        A nossa empresa nasceu do sonho e dedicação de um único profissional:
        Valmir Sabino da Silva.

        Desde o início, o objetivo sempre foi oferecer serviços em gesso
        com qualidade superior e acabamento impecável.

        Hoje seguimos firmes com os mesmos valores que deram origem à empresa:
        honestidade, pontualidade e excelência.
      </p>

    </div>

  </div>
</section>

<hr class="direita">
<hr class="direita-2">

<!-- Missão, Visão e Valores -->
<section id="valores" class="section py-5">
  <div class="container">

    <h1 class="display-4 espaço text-start">Construindo nosso futuro:</h1>

    <div class="row align-items-center mt-4">

      <!-- Cards -->
      <div class="col-lg-7">

        <div class="card shadow mb-4 card-hover">
          <div class="card-body">
            <h5>Missão</h5>
            <p class="mt-2">
              Oferecer serviços em gesso com qualidade superior e acabamento impecável.
            </p>
          </div>
        </div>

        <div class="card shadow mb-4 card-hover">
          <div class="card-body">
            <h5>Valores</h5>
            <p class="mt-2">
              Honestidade, Pontualidade, Excelência e Compromisso com o cliente.
            </p>
          </div>
        </div>

        <div class="card shadow mb-4 card-hover">
          <div class="card-body">
            <h5>Visão</h5>
            <p class="mt-2">
              Ser referência em serviços de gesso na região.
            </p>
          </div>
        </div>

      </div>

      <!-- Imagem -->
      <div class="col-lg-5 text-center">
        <img src="predio3.jpg"
             alt="Imagem de gesso"
             class="img-fluid"
             style="max-width: 100%;">
      </div>

    </div>

  </div>
</section>

<hr class="esquerda">
<hr class="esquerda-2">

<!-- Parcerias -->
<section id="parcerias" class="section py-5">
  <div class="container">

    <h1 class="display-4 text-start espaço">Trabalhos e Parcerias :</h1>

    <div class="row align-items-center mt-4">

      <div class="col-lg-7 ">

       
          <div class="card shadow mb-3 card-hover">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <img src="logo.png" width="90">
                <small class="h6">Sabino Gesso</small>
              </div>
            </div>
          </div>

          <div class="card shadow mb-3 card-hover">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <img src="logo.png" width="90">
                <small class="h6">Sabino Gesso</small>
              </div>
            </div>
          </div>

          <div class="card shadow mb-3 card-hover">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <img src="logo.png" width="90">
                <small class="h6">Sabino Gesso</small>
              </div>
            </div>
          </div>

      </div>

      

      <div class="col-lg-5 text-center">
        <img src="gessoparceria.jpg"
             alt="Imagem de gesso"
             class="img-fluid gessoparceria"
             width="300">
      </div>

    </div>

  </div>
</section>

<br><br>

<hr class="direita">
<hr class="esquerda">

<!-- Formulário -->
<section  class="section py-5 formu
lario">
  <div class="container">

    <div class="row align-items-start">

      <!-- Cards -->
      <div class="col-lg-7">

        <div class="card shadow mb-4 col-lg-10 card-hover">
          <div class="card-body">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-telephone-forward-fill"></i>
              <h5 class="mb-0">Ligue para nós</h5>
            </div>
            <p>(00) 0000-0000</p>
          </div>
        </div>

        <div class="card shadow mb-4 col-lg-10 card-hover">
          <div class="card-body">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-envelope-at-fill"></i>
              <h5 class="mb-0">E-mail</h5>
            </div>
            <p>valmirsabino30@gmail.com</p>
          </div>
        </div>

        <div class="card shadow mb-4 col-lg-10 card-hover">
          <div class="card-body">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-send-arrow-up-fill"></i>
              <h5 class="mb-0">Social</h5>
            </div>
            <p>@sabinogesso</p>
          </div>
        </div>

      </div>

      <!-- Form -->
      <div class="col-lg-5">

        <div  id="formulario" class="form-box shadow p-4 bg-white rounded">
          <h4 class="display-4 fs-1">Fazer Orçamento</h4>

          <form>
            <input type="text" class="form-control mb-2" placeholder="Nome">
            <input type="text" class="form-control mb-2" placeholder="CPF/CNPJ">
            <input type="email" class="form-control mb-2" placeholder="Email">
            <input type="text" class="form-control mb-2" placeholder="Telefone">

            <h6 class="display-4 fs-4">
              <i class="bi bi-house-check-fill"></i> Endereço do orçamento:
            </h6>

            <div class="row">
              <div class="col-md-6">
                <input type="text" class="form-control mb-2" placeholder="CEP">
              </div>
              <div class="col-md-6">
                <input type="text" class="form-control mb-2" placeholder="Estado">
              </div>
              <div class="col-md-6">
                <input type="text" class="form-control mb-2" placeholder="Cidade">
              </div>
              <div class="col-md-6">
                <input type="text" class="form-control mb-2" placeholder="Bairro">
              </div>
              <div class="col-md-6">
                <input type="text" class="form-control mb-2" placeholder="Logradouro">
              </div>
              <div class="col-md-6">
                <input type="text" class="form-control mb-2" placeholder="Número">
              </div>
            </div>

            <textarea class="form-control mt-3" rows="4" placeholder="Digite seu complemento"></textarea>

            <button class="btn w-100 mt-3 enviar">Enviar</button>
          </form>

        </div>

      </div>

    </div>

  </div>
</section>

<br><br><br>

<hr class="direita">
<hr class="esquerda">

<!-- Footer -->
<footer class="text-center">
  <p class="display-4 text-black fs-6 ">Sabino Gesso</p>
  <small class="display-4 text-black fs-6">© <?php echo date("Y"); ?> - Todos os direitos reservados</small>
</footer>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>

</body>
</html>