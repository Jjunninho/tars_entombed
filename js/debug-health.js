// ============================================================
// 🔍 DEBUG-HEALTH.JS — Monitor de Vida do TARS
// Inclua no HTML DEPOIS de main.js:
//   <script src="js/debug-health.js"></script>
// Pressione D no jogo para baixar o log em .txt
// ============================================================

(function() {
    const LOG = [];
    let frameCount = 0;
    let lastHealth = null;
    let intercepted = false;

    function timestamp() {
        return `[F${frameCount} | ${new Date().toISOString().substr(11,12)}]`;
    }

    function log(msg) {
        const entry = timestamp() + ' ' + msg;
        LOG.push(entry);
        console.log('%c' + entry, 'color: #0ff; font-family: monospace;');
    }

    // ── Espera o GAME estar disponível ──────────────────────
    function waitForGame() {
        if (typeof GAME === 'undefined') {
            setTimeout(waitForGame, 100);
            return;
        }
        if (intercepted) return;
        intercepted = true;

        log('✅ DEBUG-HEALTH ativo! GAME.health inicial = ' + GAME.health);
        log('Pressione D para baixar o log em .txt');

        // ── Intercepta GAME.health via proxy ─────────────────
        let _health = GAME.health;

        Object.defineProperty(GAME, 'health', {
            get() { return _health; },
            set(newVal) {
                const oldVal = _health;
                const delta  = newVal - oldVal;

                if (Math.abs(delta) > 0.0001) { // filtra ruído de float
                    // Pega o stack trace para saber QUEM alterou
                    const stack = new Error().stack
                        .split('\n')
                        .slice(2, 6) // pega as 4 linhas mais relevantes
                        .map(s => s.trim().replace(/^at /, ''))
                        .join(' → ');

                    const arrow = delta < 0 ? '🔴 DANO' : '💚 CURA';
                    const msg = `${arrow} ${delta > 0 ? '+' : ''}${delta.toFixed(4)} | ${oldVal.toFixed(2)} → ${newVal.toFixed(2)} | CHAMADOR: ${stack}`;
                    log(msg);

                    // Alerta se for dano suspeito pequeno (possível lógica antiga)
                    if (delta < 0 && delta > -2) {
                        log('⚠️  DANO SUSPEITO (< 2) — pode ser lógica legada de coração!');
                    }

                    // Alerta se health for setado diretamente para valor < 10 sem ser 0
                    if (newVal < 10 && newVal > 0 && oldVal > 10) {
                        log('🚨 QUEDA BRUSCA para ' + newVal.toFixed(2) + ' — investigar!');
                    }
                }

                _health = newVal;
            },
            configurable: true
        });

        // ── Monitor de frame — detecta reset inesperado ──────
        const origGameLoop = window.gameLoop;
        let _lastFrameHealth = GAME.health;

        // Hook no requestAnimationFrame para contar frames
        const origRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(cb) {
            return origRAF(function(t) {
                frameCount++;

                // Detecta se health foi resetado para 100 (morte/reset)
                if (_lastFrameHealth < 50 && GAME.health === 100) {
                    log('💀 RESET DETECTADO — TARS morreu! Health estava em ' + _lastFrameHealth.toFixed(2));
                }
                _lastFrameHealth = GAME.health;

                cb(t);
            });
        };

        log('🎯 Interceptação ativa. Aguardando alterações em GAME.health...');
        log('─────────────────────────────────────────────────────');
    }

    // ── Tecla D: baixar log ──────────────────────────────────
    window.addEventListener('keydown', function(e) {
        if (e.key === 'd' || e.key === 'D') {
            if (e.ctrlKey) return; // não intercepta Ctrl+D
            e.preventDefault();

            const content = [
                'TARS ENTOMBED — DEBUG LOG DE SAÚDE',
                'Gerado em: ' + new Date().toLocaleString(),
                'Total de entradas: ' + LOG.length,
                '═══════════════════════════════════════════════════',
                '',
                ...LOG,
                '',
                '═══════════════════════════════════════════════════',
                'FIM DO LOG'
            ].join('\n');

            const blob = new Blob([content], { type: 'text/plain' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = 'tars-debug-health.txt';
            a.click();
            URL.revokeObjectURL(url);

            console.log('%c📄 Log baixado! (' + LOG.length + ' entradas)', 'color: #ff0; font-size: 14px;');
        }
    });

    // ── Inicia ───────────────────────────────────────────────
    waitForGame();

    console.log('%c🔍 DEBUG-HEALTH.JS carregado — aguardando GAME...', 'color: #f0f; font-size: 13px;');
    console.log('%cPressione D durante o jogo para salvar o log em .txt', 'color: #aaa;');

})();
