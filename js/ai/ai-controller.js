// ============================================================
// 🤖 AI CONTROLLER — Orquestrador Headless
// Arquivo: js/ai/ai-controller.js
// Depende de: ai-recorder.js, ai-brain.js
//
// Modos:
//   HUMAN           — jogador humano controla (padrão)
//   RECORDING       — humano joga, recorder captura dados
//   TRAINING        — treina headless acelerado (sem render, máx velocidade)
//   TRAINING_VISUAL — treina com render ligado (60fps, dá pra assistir)
//   PLAYING         — IA controla o TARS, sem treinamento
// ============================================================

window.AIController = (function () {
    'use strict';

    // ── Estado Interno ─────────────────────────────────────────────
    const MODES = { HUMAN: 'HUMAN', RECORDING: 'RECORDING', TRAINING: 'TRAINING', TRAINING_VISUAL: 'TRAINING_VISUAL', PLAYING: 'PLAYING' };
    let currentMode = MODES.HUMAN;

    // Stats de episódio (RL)
    let episodeReward   = 0;
    let episodeDepth    = 0;
    let totalEpisodes   = 0;
    let bestDepth       = 0;
    let avgRewardHist   = [];   // histórico das últimas 50 rewards
    let rlLossHist      = [];   // histórico de loss

    // Estado anterior (para cálculo de reward)
    let prevHealth      = 100;
    let prevDepth       = 0;
    let prevBossOpen    = false;

    // Headless: controle do loop acelerado
    let headlessHandle  = null;
    const STEPS_PER_BATCH = 300;  // ticks de jogo por setTimeout batch

    // Referência ao RAF original (para restaurar ao sair do headless)
    const _origRAF = window.requestAnimationFrame.bind(window);
    let   rafStopped = false;

    // ── Parar / Retomar RAF ────────────────────────────────────────
    function stopRAF() {
        if (rafStopped) return;
        rafStopped = true;
        // Substitui requestAnimationFrame por no-op: o gameLoop nativo para sozinho
        window.requestAnimationFrame = () => 0;
        console.log('⏸️ RAF (render loop) pausado — modo headless ativo');
    }

    function resumeRAF() {
        if (!rafStopped) return;
        rafStopped = false;
        window.requestAnimationFrame = _origRAF;
        // Reinicia o gameLoop normal
        gameLoop();
        console.log('▶️ RAF retomado — render normal');
    }

    // ── Silenciar sistemas pesados durante headless ────────────────
    let _origAudioPlay = null;
    let _origUIUpdate  = null;

    function muteForHeadless() {
        if (typeof AudioSynth !== 'undefined') {
            _origAudioPlay      = AudioSynth.playSound;
            AudioSynth.playSound = () => {};
        }
        if (typeof UIController !== 'undefined') {
            _origUIUpdate             = UIController.updateHealth;
            UIController.updateHealth = () => {};
        }
    }

    function unmuteAfterHeadless() {
        if (typeof AudioSynth !== 'undefined' && _origAudioPlay) {
            AudioSynth.playSound = _origAudioPlay;
        }
        if (typeof UIController !== 'undefined' && _origUIUpdate) {
            UIController.updateHealth = _origUIUpdate;
        }
    }

    // ── Função de Reward ───────────────────────────────────────────
    function computeReward(done) {
        let r = 0;

        // +reward por descer (objetivo principal)
        const depthGain = GAME.depth - prevDepth;
        r += depthGain * 0.05;

        // -penalidade por perder bateria
        const healthLost = prevHealth - GAME.health;
        if (healthLost > 0) r -= healthLost * 0.3;

        // +bonus por recuperar bateria (gema coletada)
        if (GAME.health > prevHealth) r += 0.5;

        // +bonus por boss derrotado
        const bossJustOpened = (typeof BossSystem !== 'undefined') &&
            BossSystem.arenaOpen && !prevBossOpen;
        if (bossJustOpened) r += 20;

        // -penalidade por morte
        if (done) r -= 10;

        return r;
    }

    // ── Aplicar Ação no Jogo ───────────────────────────────────────
    function applyAction(action) {
        // Limpa teclas anteriores
        keys['ArrowLeft']  = false;
        keys['ArrowRight'] = false;
        keys['ArrowUp']    = false;

        keys['ArrowLeft']  = action[0] === 1;
        keys['ArrowRight'] = action[1] === 1;
        keys['ArrowUp']    = action[2] === 1;

        // Troca de modo via API direta (não via evento de teclado)
        if (action[3] === 1) {
            const cfg = typeof GameConfig !== 'undefined' ? GameConfig.ACTIVE.gameplay : { modeSwitchCooldown: 10 };
            if (GAME.frameCount - GAME.lastModeSwitch >= cfg.modeSwitchCooldown) {
                if (typeof togglePlayerMode === 'function') {
                    togglePlayerMode(allPlatforms);
                    GAME.lastModeSwitch = GAME.frameCount;
                }
            }
        }
    }

    function clearAction() {
        keys['ArrowLeft']  = false;
        keys['ArrowRight'] = false;
        keys['ArrowUp']    = false;
    }

    // ── Salvar estado anterior ─────────────────────────────────────
    function savePrevState() {
        prevHealth   = GAME.health;
        prevDepth    = GAME.depth;
        prevBossOpen = (typeof BossSystem !== 'undefined') ? BossSystem.arenaOpen : false;
    }

    // ── Um tick do modo PLAYING (IA em tempo real) ─────────────────
    function aiPlayTick() {
        if (currentMode !== MODES.PLAYING) return;

        const state  = AIRecorder.extractState();
        const action = AIBrain.phase === 'rl'
            ? AIBrain.actRL(state)
            : AIBrain.actImitation(state);

        applyAction(action);
    }

    // Referência à função update original (antes do hook) — usada no headless
    let _headlessUpdate = null;

    // ── Um step do loop RL headless ───────────────────────────────
    function rlStep() {
        const state = AIRecorder.extractState();
        savePrevState();

        // Seleciona e aplica ação
        const action = AIBrain.actRL(state);
        applyAction(action);

        // Avança um tick do jogo (sem render, usando update original)
        let done = false;
        if (GAME.health <= 0 || player.y > GAME.cameraY + 800 + 300) {
            done = true;
        } else {
            if (_headlessUpdate) _headlessUpdate();
        }

        // Pega novo estado e computa reward
        const nextState = AIRecorder.extractState();
        const reward    = computeReward(done);

        episodeReward += reward;
        episodeDepth   = Math.max(episodeDepth, GAME.depth);

        // Armazena no replay buffer
        AIBrain.remember(state, action, reward, nextState, done);

        // Treina um batch a cada step (se buffer suficiente)
        const loss = AIBrain.trainRLStep();
        if (loss !== null) rlLossHist.push(loss);
        if (rlLossHist.length > 200) rlLossHist.shift();

        if (done) {
            totalEpisodes++;
            bestDepth = Math.max(bestDepth, episodeDepth);
            avgRewardHist.push(episodeReward);
            if (avgRewardHist.length > 50) avgRewardHist.shift();

            console.log(
                `🎮 Ep ${totalEpisodes} | Profundidade: ${episodeDepth}m | ` +
                `Reward: ${episodeReward.toFixed(1)} | ε: ${AIBrain.epsilon}`
            );

            // Reseta o jogo para o próximo episódio (nova seed aleatória)
            episodeReward = 0;
            episodeDepth  = 0;
            resetGame(); // usa seed aleatória por padrão
        }
    }

    // ── Step RL Visual (com render, 60fps) ────────────────────────
    // Diferente do rlStep headless: o update já foi chamado pelo gameLoop.
    // Aqui só fazemos reward, remember e trainRLStep.
    let _vsState = null; // estado antes da ação (capturado no tick anterior)

    function rlVisualStep() {
        const nextState = AIRecorder.extractState();
        const reward    = computeReward(false);
        episodeReward  += reward;
        episodeDepth    = Math.max(episodeDepth, GAME.depth);

        if (_vsState) {
            const done = GAME.health <= 0;
            AIBrain.remember(_vsState, _vsLastAction, reward, nextState, done);
            AIBrain.trainRLStep();

            if (done) {
                totalEpisodes++;
                bestDepth = Math.max(bestDepth, episodeDepth);
                avgRewardHist.push(episodeReward);
                if (avgRewardHist.length > 50) avgRewardHist.shift();
                episodeReward = 0;
                episodeDepth  = 0;
            }
        }

        // Prepara próximo step: captura estado atual e escolhe ação
        _vsState = nextState;
        _vsLastAction = AIBrain.actRL(nextState);
        savePrevState();
    }
    let _vsLastAction = new Uint8Array(4);
    function headlessBatch() {
        if (currentMode !== MODES.TRAINING) return;

        for (let i = 0; i < STEPS_PER_BATCH; i++) {
            rlStep();
        }

        // Atualiza HUD a cada batch
        updateHUD();

        // Salva checkpoint a cada 5000 steps
        if (AIBrain.stepCount > 0 && AIBrain.stepCount % 5000 === 0) {
            AIBrain.save();
            console.log(`💾 Checkpoint salvo — ${AIBrain.stepCount} steps`);
        }

        // Agenda o próximo batch (yield para o browser não travar)
        headlessHandle = setTimeout(headlessBatch, 0);
    }

    // ── HUD Flutuante ──────────────────────────────────────────────
    let hudEl = null;

    function createHUD() {
        if (hudEl) return;
        hudEl = document.createElement('div');
        hudEl.id = 'ai-hud';
        hudEl.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 9999;
            background: rgba(0,0,0,0.88); border: 1px solid #0ff;
            color: #0ff; font: 11px monospace; padding: 10px 14px;
            border-radius: 6px; min-width: 220px; user-select: none;
        `;
        document.body.appendChild(hudEl);
        updateHUD();
    }

    function updateHUD() {
        if (!hudEl) return;
        const stats  = AIBrain.getStats();
        const avgR   = avgRewardHist.length > 0
            ? (avgRewardHist.reduce((a, b) => a + b, 0) / avgRewardHist.length).toFixed(1)
            : '—';
        const avgL   = rlLossHist.length > 0
            ? (rlLossHist.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, rlLossHist.length)).toFixed(4)
            : '—';

        const modeColor = {
            HUMAN: '#aaa', RECORDING: '#f44', TRAINING: '#ff0',
            TRAINING_VISUAL: '#fa0', PLAYING: '#0f0'
        }[currentMode] || '#fff';

        hudEl.innerHTML = `
            <div style="color:#fff;font-size:13px;font-weight:bold;margin-bottom:6px">🤖 TARS AI</div>
            <div>Modo: <span style="color:${modeColor}">${currentMode}</span></div>
            <div>Fase: <b>${stats.phase.toUpperCase()}</b></div>
            <hr style="border-color:#333;margin:5px 0">
            <div>Episódios:   <b>${totalEpisodes}</b></div>
            <div>Melhor prof: <b>${bestDepth}m</b></div>
            <div>Reward médio:<b>${avgR}</b></div>
            <div>ε (epsilon):  <b>${stats.epsilon}</b></div>
            <div>Steps RL:    <b>${stats.stepCount}</b></div>
            <div>Buffer:      <b>${stats.bufferSize}/${15000}</b></div>
            <div>Loss:        <b>${avgL}</b></div>
            <div>Gravações:   <b>${AIRecorder.frameCount} frames</b></div>
            <hr style="border-color:#333;margin:5px 0">
            ${renderButtons()}
        `;
    }

    function renderButtons() {
        const btns = [
            { id: 'ai-btn-rec',    label: currentMode === MODES.RECORDING        ? '⏹ Parar Gravação'      : '🔴 Gravar Gameplay',          color: '#f44' },
            { id: 'ai-btn-imit',   label: '📚 Treinar Imitação',                                            color: '#88f' },
            { id: 'ai-btn-rl',     label: currentMode === MODES.TRAINING          ? '⏹ Parar Treino RL'     : '⚡ Treinar RL (Headless)',     color: '#ff0' },
            { id: 'ai-btn-rlvis',  label: currentMode === MODES.TRAINING_VISUAL   ? '⏹ Parar Treino Visual' : '👁️ Treinar RL (Visual 60fps)', color: '#fa0' },
            { id: 'ai-btn-play',   label: currentMode === MODES.PLAYING           ? '👤 Voltar ao Humano'   : '🤖 IA Jogar',                  color: '#0f0' },
            { id: 'ai-btn-save',   label: '💾 Salvar Cérebro',                                              color: '#0cc' },
            { id: 'ai-btn-load',   label: '📂 Carregar Cérebro',                                            color: '#0cc' },
        ];

        return btns.map(b =>
            `<button id="${b.id}" style="
                display:block;width:100%;margin:2px 0;padding:4px;
                background:transparent;border:1px solid ${b.color};
                color:${b.color};font:10px monospace;cursor:pointer;border-radius:3px;
            ">${b.label}</button>`
        ).join('');
    }

    function bindButtons() {
        document.addEventListener('click', e => {
            const id = e.target?.id;
            if (!id || !id.startsWith('ai-btn-')) return;

            if (id === 'ai-btn-rec')   handleRecord();
            if (id === 'ai-btn-imit')  handleTrainImitation();
            if (id === 'ai-btn-rl')    handleTrainRL();
            if (id === 'ai-btn-rlvis') handleTrainVisual();
            if (id === 'ai-btn-play')  handleTogglePlay();
            if (id === 'ai-btn-save') { AIBrain.save(); AIRecorder.save(); }
            if (id === 'ai-btn-load') { AIBrain.load(); }

            updateHUD();
        });
    }

    // ── Handlers dos Botões ────────────────────────────────────────
    function handleRecord() {
        if (currentMode === MODES.RECORDING) {
            AIRecorder.stop();
            currentMode = MODES.HUMAN;
        } else {
            if (currentMode !== MODES.HUMAN) return;
            AIRecorder.start();
            currentMode = MODES.RECORDING;
        }
    }

    function handleTrainImitation() {
        const dataset = AIRecorder.load();
        if (dataset.length < 100) {
            console.warn(`⚠️ Poucos dados: ${dataset.length} frames (mínimo 100)`);
            alert(`Grave pelo menos 100 frames primeiro!\nAtual: ${dataset.length}`);
            return;
        }

        // Treina de forma assíncrona em microbatches para não travar o browser
        currentMode = MODES.HUMAN;
        console.log('🧠 Iniciando treino por imitação...');

        // Usa setTimeout para não bloquear a UI
        setTimeout(() => {
            AIBrain.trainImitation(dataset, 20, (ep, loss) => {
                if (hudEl) {
                    hudEl.querySelector('div:nth-child(3)').textContent =
                        `Treinando... época ${ep}/20 | loss: ${loss.toFixed(4)}`;
                }
            });
            AIBrain.save();
            alert(`✅ Treino de imitação concluído!\nInicie o modo RL para refinar.`);
            updateHUD();
        }, 100);
    }

    function handleTrainRL() {
        if (currentMode === MODES.TRAINING) {
            // Para o treino
            clearTimeout(headlessHandle);
            headlessHandle = null;
            clearAction();
            unmuteAfterHeadless();
            resumeRAF();
            currentMode = MODES.HUMAN;
            AIBrain.save();
            console.log('⏹️ Treino RL parado');
        } else {
            if (currentMode !== MODES.HUMAN && currentMode !== MODES.PLAYING) return;
            currentMode = MODES.TRAINING;
            muteForHeadless();
            stopRAF();
            resetGame(); // episódio fresco
            console.log('⚡ Treino RL headless iniciado!');
            headlessHandle = setTimeout(headlessBatch, 0);
        }
    }

    function handleTrainVisual() {
        if (currentMode === MODES.TRAINING_VISUAL) {
            clearAction();
            _vsState = null;
            currentMode = MODES.HUMAN;
            AIBrain.save();
            console.log('⏹️ Treino visual parado');
        } else {
            if (currentMode !== MODES.HUMAN && currentMode !== MODES.PLAYING) return;
            _vsState = null;
            currentMode = MODES.TRAINING_VISUAL;
            resetGame();
            console.log('👁️ Treino RL visual iniciado (60fps — mais lento que headless)');
        }
    
        if (currentMode === MODES.PLAYING) {
            clearAction();
            currentMode = MODES.HUMAN;
            console.log('👤 Controle devolvido ao humano');
        } else {
            if (currentMode !== MODES.HUMAN) return;
            if (!localStorage.getItem('tars_ai_brain')) {
                alert('Treine o cérebro primeiro! (Imitação ou RL)');
                return;
            }
            AIBrain.load();
            currentMode = MODES.PLAYING;
            console.log('🤖 IA assumiu o controle!');
        }
    }
	
    function handleTogglePlay() {
        if (currentMode === MODES.PLAYING) {
            clearAction();
            currentMode = MODES.HUMAN;
            console.log('👤 Controle devolvido ao humano');
        } else {
            if (currentMode !== MODES.HUMAN) return;
            // Verifica se existe um cérebro treinado para carregar
            if (!localStorage.getItem('tars_ai_brain')) {
                alert('Treine o cérebro primeiro! (Imitação ou RL)');
                return;
            }
            AIBrain.load();
            currentMode = MODES.PLAYING;
            console.log('🤖 IA assumiu o controle!');
        }
    }

    // ── Hook no update() ──────────────────────────────────────────
    function installUpdateHook() {
        if (typeof window.update !== 'function') {
            setTimeout(installUpdateHook, 100);
            return;
        }

        const _origUpdate = window.update;
        _headlessUpdate = _origUpdate; 

        window.update = function () {
            _origUpdate();

            if (currentMode === MODES.RECORDING) {
                AIRecorder.tick();
            }

            if (currentMode === MODES.PLAYING || currentMode === MODES.TRAINING_VISUAL) {
                aiPlayTick();
            }

            if (currentMode === MODES.TRAINING_VISUAL) {
                rlVisualStep();
            }

            if (typeof GAME !== 'undefined' && GAME.frameCount % 60 === 0) {
                updateHUD();
            }
        };

        console.log('🔗 Hook de update() instalado com sucesso');
    }

    // ── Inicialização ──────────────────────────────────────────────
    return {
        MODES,
        get mode() { return currentMode; },

        init() {
            createHUD();
            bindButtons();
            installUpdateHook();

            const loaded = AIBrain.load();
            if (loaded) console.log('🤖 Cérebro anterior carregado automaticamente');

            console.log([
                '🤖 AIController pronto!',
                '  Atalhos de teclado:',
                '  G = gravar/parar gravação',
                '  T = treinar RL headless on/off',
                '  P = IA jogar on/off',
            ].join('\n'));
        },

        bindKeys() {
            window.addEventListener('keydown', e => {
                if (e.key === 'g' || e.key === 'G') handleRecord();
                if (e.key === 't' || e.key === 'T') handleTrainRL();
                if (e.key === 'p' || e.key === 'P') handleTogglePlay();
                updateHUD();
            });
        },

        getStats() {
            return {
                mode: currentMode,
                episodes: totalEpisodes,
                bestDepth,
                avgReward: avgRewardHist.length > 0
                    ? avgRewardHist.reduce((a, b) => a + b, 0) / avgRewardHist.length
                    : 0,
                brain: AIBrain.getStats()
            };
        }
    };
})();

// ── Auto-init após DOM pronto ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        AIController.init();
        AIController.bindKeys();
        console.log('✅ Sistema de IA inicializado!');
    }, 500);
});
