/* ============================================================
   DUAS LUAS, UM DESTINO — animações de scroll (JS puro)
   Sem dependências externas. Funciona em qualquer navegador
   moderno (usa IntersectionObserver + requestAnimationFrame).
   ============================================================ */


document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------
     1. Revelação suave de cada capítulo ao entrar na tela
     ------------------------------------------------------------ */
  const revealEls = document.querySelectorAll(
    '.scene:not(.scene-hero) .scene-art, .scene-content > *'
  );

  revealEls.forEach(el => el.classList.add('will-reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -10% 0px'
  });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ------------------------------------------------------------
     2. Indicador fixo — atualiza o número do capítulo conforme
        a cena mais visível na tela, e guarda o índice atual
        para os botões de navegação das luas
     ------------------------------------------------------------ */
  const chapterLabel = document.getElementById('chapterNum');
  const scenesInOrder = Array.from(document.querySelectorAll('.scene'))
    .sort((a, b) => Number(a.dataset.chapter) - Number(b.dataset.chapter));

  let currentIndex = 0;

  if (chapterLabel && scenesInOrder.length) {
    const chapterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const chapter = entry.target.dataset.chapter || '0';
          chapterLabel.textContent = chapter.padStart(2, '0');
          currentIndex = scenesInOrder.indexOf(entry.target);
        }
      });
    }, { threshold: 0.5 });

    scenesInOrder.forEach(scene => chapterObserver.observe(scene));
  }

  /* ------------------------------------------------------------
     3. Navegação pelas luas do indicador fixo
        (crescente = capítulo anterior · cheia = próximo capítulo)
     ------------------------------------------------------------ */
  const prevBtn = document.getElementById('prevChapterBtn');
  const nextBtn = document.getElementById('nextChapterBtn');

  function goToChapter(index) {
    const clamped = Math.max(0, Math.min(scenesInOrder.length - 1, index));
    scenesInOrder[clamped].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goToChapter(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToChapter(currentIndex + 1));

  /* ------------------------------------------------------------
     4. Botão "voltar ao início", no rodapé
     ------------------------------------------------------------ */
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------
     5. Parallax suave nas fotos de cada capítulo, via variável
        CSS --parallax-y (não sobrescreve os transforms já
        existentes no style.css, como translateX(-50%))
     ------------------------------------------------------------ */
  const parallaxEls = document.querySelectorAll(
    '.art-hologram, .art-home, .art-luke, .art-han, .art-starwars, ' +
    '.art-deathstar, .art-force, .art-heroluke, .art-darth, ' +
    '.hero-photo, .figure-silhouette'
  );

  let ticking = false;

  function updateParallax() {
    const viewportH = window.innerHeight;

    parallaxEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportH) return; // fora da tela, ignora

      const center = rect.top + rect.height / 2;
      const offset = (center - viewportH / 2) / viewportH; // aprox. -0.5 a 0.5
      const move = offset * 26; // até ~26px de deslocamento
      el.style.setProperty('--parallax-y', `${move.toFixed(1)}px`);
    });

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateParallax();

  /* ------------------------------------------------------------
     6. Chuva de meteoros — dispara no início de cada capítulo
        Canvas fixo (.meteor-canvas), atrás do conteúdo. Uma
        rajada de meteoros na cor do "mood" da cena entra assim
        que o capítulo cruza a tela, e some entre um capítulo e
        outro (com raros meteoros avulsos de ambientação).
     ------------------------------------------------------------ */
  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('meteorCanvas');

  if (canvas && !reduzMovimento) {
    const ctx = canvas.getContext('2d');
    let larguraTela, alturaTela;

    function redimensionarCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      // tamanho "visual" em pixels CSS — é com esse valor que a
      // física das partículas (posição/velocidade) trabalha
      larguraTela = window.innerWidth;
      alturaTela = window.innerHeight;

      // buffer de desenho em pixels reais, pra ficar nítido em
      // telas retina/alta densidade, sem esticar nem distorcer
      canvas.width = Math.round(larguraTela * dpr);
      canvas.height = Math.round(alturaTela * dpr);
      canvas.style.width = larguraTela + 'px';
      canvas.style.height = alturaTela + 'px';

      // reseta qualquer escala anterior antes de aplicar a nova,
      // pra não acumular escala a cada resize
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    redimensionarCanvas();
    window.addEventListener('resize', redimensionarCanvas);
    window.addEventListener('orientationchange', redimensionarCanvas);

    const CORES_MOOD = {
      gold:  '232, 182, 90',
      blue:  '111, 157, 196',
      ember: '192, 67, 43',
      dusk:  '143, 122, 168',
      flash: '237, 230, 214'
    };

    let meteoros = [];

    function criarMeteoro(corRgb) {
      const comecaNoTopo = Math.random() < 0.6;
      const x = comecaNoTopo ? Math.random() * larguraTela : -60;
      const y = comecaNoTopo ? -60 : Math.random() * alturaTela * 0.45;
      const angulo = (Math.PI / 4) + (Math.random() * 0.3 - 0.15);
      const velocidade = Math.random() * 6 + 7;

      return {
        x, y,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        comprimentoMax: Math.random() * 26 + 18,
        espessura: Math.random() * 1.4 + 1,
        cor: corRgb,
        rastro: []
      };
    }

    function dispararRajada(mood) {
      const cor = CORES_MOOD[mood] || CORES_MOOD.flash;
      const quantidade = Math.floor(Math.random() * 3) + 4; // 4 a 6 meteoros

      for (let i = 0; i < quantidade; i++) {
        setTimeout(() => {
          meteoros.push(criarMeteoro(cor));
        }, i * 180 + Math.random() * 200);
      }
    }

    // meteoro avulso e raro, para o fundo nunca ficar totalmente parado
    function agendarMeteoroAvulso() {
      const delay = Math.random() * 600 + 500;
      setTimeout(() => {
        meteoros.push(criarMeteoro(CORES_MOOD.flash));
        agendarMeteoroAvulso();
      }, delay);
    }
    agendarMeteoroAvulso();

    function desenharMeteoros() {
      ctx.clearRect(0, 0, larguraTela, alturaTela);

      for (let i = meteoros.length - 1; i >= 0; i--) {
        const m = meteoros[i];

        m.rastro.push({ x: m.x, y: m.y });
        if (m.rastro.length > m.comprimentoMax) m.rastro.shift();

        m.x += m.vx;
        m.y += m.vy;

        for (let j = 0; j < m.rastro.length; j++) {
          const ponto = m.rastro[j];
          const t = j / m.rastro.length;
          ctx.beginPath();
          ctx.arc(ponto.x, ponto.y, m.espessura * t, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${m.cor}, ${t * 0.75})`;
          ctx.fill();
        }

        // cabeça brilhante
        const brilho = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.espessura * 4);
        brilho.addColorStop(0, `rgba(${m.cor}, 0.9)`);
        brilho.addColorStop(1, `rgba(${m.cor}, 0)`);
        ctx.beginPath();
        ctx.fillStyle = brilho;
        ctx.arc(m.x, m.y, m.espessura * 4, 0, Math.PI * 2);
        ctx.fill();

        if (m.x > larguraTela + 100 || m.y > alturaTela + 100) {
          meteoros.splice(i, 1);
        }
      }

      requestAnimationFrame(desenharMeteoros);
    }
    desenharMeteoros();

    // reaproveita o IntersectionObserver de capítulos já existente
    // para disparar a rajada assim que um novo capítulo começa
    let ultimoCapituloDisparado = null;

    const meteorObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const capitulo = entry.target.dataset.chapter;
          if (capitulo !== ultimoCapituloDisparado) {
            ultimoCapituloDisparado = capitulo;
            dispararRajada(entry.target.dataset.mood);
          }
        }
      });
    }, { threshold: 1.35 });

    scenesInOrder.forEach(scene => meteorObserver.observe(scene));
  }

});
