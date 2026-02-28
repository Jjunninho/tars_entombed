// ============================================================
// 🎥 AI RECORDER — Gravador de Gameplay Humano
// Arquivo: js/ai/ai-recorder.js
// Grava state+action por frame enquanto o jogador joga.
// Os dados alimentam a fase de Imitação do AIBrain.
// ============================================================

window.AIRecorder = (function () {
    'use strict';

    const MAX_FRAMES   = 100000; // ~27min a 60fps
    const STORAGE_KEY  = 'tars_ai_recordings';

    let recording  = false;
    let data       = [];       // [{state: Float32Array, action: Uint8Array}]
    let framesSinceLastSave = 0;
    const AUTOSAVE_INTERVAL = 1800; // salva a cada 30s

    // ── Extração de Estado ────────────────────────────────────────
    // Retorna vetor de 12 features normalizadas descrevendo o estado atual do jogo.
    function extractState() {
        // 1. Cinemática do player
        const vx      = Math.max(-1, Math.min(1, player.velX / 8));
        const vy      = Math.max(-1, Math.min(1, player.velY / 15));
        const px      = (player.x - 400) / 400;                     // -1=esquerda, +1=direita
        const ground  = player.onGround ? 1 : 0;
        const mode    = player.modeIndex;                            // 0=caminhada, 1=asterisco

        // 2. Distância até o chão mais próximo (abaixo dos pés)
        const feetY    = player.y + player.height;
        let floorDist  = 520;
        for (const p of allPlatforms) {
            if (p.y >= feetY &&
                p.x < player.x + player.width &&
                p.x + p.w > player.x) {
                floorDist = Math.min(floorDist, p.y - feetY);
            }
        }
        const floorN = floorDist / 520;

        // 3. Bateria e contexto de boss
        const health  = GAME.health / 100;
        const inBoss  = (typeof BossSystem !== 'undefined' && BossSystem.active) ? 1 : 0;

        // 4. Inimigo mais próximo
        let edx = 0, edy = 0, eDist = 1;
        if (typeof allEnemies !== 'undefined' && allEnemies.length > 0) {
            let minDist = Infinity;
            for (const e of allEnemies) {
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d < minDist) {
                    minDist = d;
                    edx     = Math.max(-1, Math.min(1, dx / 400));
                    edy     = Math.max(-1, Math.min(1, dy / 400));
                    eDist   = Math.min(1, d / 500);
                }
            }
        }

        // 5. Proximidade com as paredes
        const wallProx = player.x / 800;

        return new Float32Array([vx, vy, px, ground, mode, floorN, health, inBoss, edx, edy, eDist, wallProx]);
    }

    // ── Extração de Ação ─────────────────────────────────────────
    // Captura teclas pressionadas neste frame como vetor binário.
    function extractAction() {
        return new Uint8Array([
            keys['ArrowLeft']  ? 1 : 0,
            keys['ArrowRight'] ? 1 : 0,
            keys['ArrowUp']    ? 1 : 0,
            keys[' ']          ? 1 : 0   // trocar modo
        ]);
    }

    // ── API Pública ───────────────────────────────────────────────
    return {
        get isRecording() { return recording; },
        get frameCount()  { return data.length; },

        start() {
            if (recording) return;
            recording = true;
            framesSinceLastSave = 0;
            console.log('🔴 Gravação iniciada — jogue normalmente!');
        },

        stop() {
            if (!recording) return;
            recording = false;
            this.save();
            console.log(`⏹️ Gravação parada — ${data.length} frames gravados`);
        },

        // Chamado pelo AIController a cada frame do jogo
        tick() {
            if (!recording) return;
            if (data.length >= MAX_FRAMES) { this.stop(); return; }

            const state  = extractState();
            const action = extractAction();

            // Filtra frames sem ação (reduz bias de "não fazer nada")
            const hasAction = action.some(v => v === 1);
            if (hasAction || Math.random() < 0.2) {
                data.push({ state, action });
            }

            framesSinceLastSave++;
            if (framesSinceLastSave >= AUTOSAVE_INTERVAL) {
                this.save();
                framesSinceLastSave = 0;
            }
        },

        save() {
            try {
                // Serializa Float32Array e Uint8Array como arrays normais
                const serializable = data.map(d => ({
                    s: Array.from(d.state),
                    a: Array.from(d.action)
                }));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
                console.log(`💾 ${data.length} frames salvos no localStorage`);
            } catch (e) {
                console.warn('⚠️ Erro ao salvar gravação:', e);
            }
        },

        load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) { console.log('📂 Nenhuma gravação encontrada'); return []; }
                const parsed = JSON.parse(raw);
                data = parsed.map(d => ({
                    state:  new Float32Array(d.s),
                    action: new Uint8Array(d.a)
                }));
                console.log(`📂 ${data.length} frames carregados`);
                return data;
            } catch (e) {
                console.warn('⚠️ Erro ao carregar gravação:', e);
                return [];
            }
        },

        clear() {
            data = [];
            localStorage.removeItem(STORAGE_KEY);
            console.log('🗑️ Gravações apagadas');
        },

        getData() { return data; },

        // Exporta como arquivo JSON para backup externo
        exportJSON() {
            const serializable = data.map(d => ({ s: Array.from(d.state), a: Array.from(d.action) }));
            const blob = new Blob([JSON.stringify(serializable)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `tars_recording_${data.length}frames_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        // Importa de arquivo JSON
        importJSON(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    const imported = parsed.map(d => ({
                        state:  new Float32Array(d.s),
                        action: new Uint8Array(d.a)
                    }));
                    data = [...data, ...imported];
                    console.log(`📥 ${imported.length} frames importados (total: ${data.length})`);
                } catch (err) {
                    console.error('❌ Erro ao importar:', err);
                }
            };
            reader.readAsText(file);
        },

        // Extração avulsa (usada pelo AIController no modo RL)
        extractState,
        extractAction
    };
})();
