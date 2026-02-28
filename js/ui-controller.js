// ARQUIVO: js/ui-controller.js - VERSÃO COMPLETA E REPARADA
const UIController = {
    elements: {},
    lastUpdate: 0,
    updateInterval: 100,
    
    init() {
        console.log('🎨 Inicializando UIController Completo...');
        this.elements = {
            depthDisplay: document.getElementById('depthDisplay'),
            scoreDisplay: document.getElementById('scoreDisplay'),
            highScoreDisplay: document.getElementById('highScoreDisplay'),
            healthDisplay: document.getElementById('healthDisplay'),
            modeDisplay: document.getElementById('modeDisplay'),
            chunksDisplay: document.getElementById('chunksDisplay'),
            seedInput: document.getElementById('seedInput'),
            applySeedBtn: document.getElementById('applySeedBtn'),
            fpsDisplay: document.getElementById('fpsDisplay'),
            statusDisplay: document.getElementById('statusDisplay'),
            walkBtn: document.getElementById('walkBtn'),
            rollBtn: document.getElementById('rollBtn'),
            modeNotification: document.getElementById('modeNotification'),
            cooldownBar: document.getElementById('cooldownBar'),
            cooldownFill: document.getElementById('cooldownFill')
        };
        
        // Configuração da Semente
        if (this.elements.applySeedBtn) {
            this.elements.applySeedBtn.onclick = () => {
                const inputVal = document.getElementById('seedInput').value;
                const newSeed = parseInt(inputVal);
                if (!isNaN(newSeed)) {
                    resetGame(newSeed); 
                    if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('powerup');
                }
            };
        }

        this.setupDifficultyButtons();
        this.setupModeButtons();
        console.log('✅ UIController inicializado com suporte a notificações!');
    },
    
    setupDifficultyButtons() {
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                diffButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (typeof GameConfig !== 'undefined') {
                    GameConfig.apply(btn.dataset.difficulty);
                    resetGame();
                }
            });
        });
    },
    
    setupModeButtons() {
        // Vincula os cliques dos botões da UI à tecla de espaço
        if (this.elements.walkBtn) this.elements.walkBtn.onclick = () => keys[' '] = true;
        if (this.elements.rollBtn) this.elements.rollBtn.onclick = () => keys[' '] = true;
    },
    
    update() {
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = now;
        
        if (typeof GAME !== 'undefined') {
            this.updateDepth(GAME.depth || 0);
            this.updateScore(GAME.score || 0);
            this.updateHighScore(GAME.highScore || 0);
            this.updateHealth(GAME.health || 0);
        }
        if (typeof chunks !== 'undefined') this.updateChunks(chunks.length);
        if (typeof player !== 'undefined') this.updateMode(player.modeIndex);
        this.updateCooldown();
    },
    
    updateDepth(depth) {
        if (this.elements.depthDisplay) {
            this.elements.depthDisplay.textContent = `${depth}m`;
            this.elements.depthDisplay.style.color = depth > 500 ? '#f00' : (depth > 200 ? '#ff0' : '#0f0');
        }
    },
    
    updateScore(score) {
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = String(score).padStart(6, '0');
        }
    },

    updateHighScore(score) {
        if (this.elements.highScoreDisplay) {
            this.elements.highScoreDisplay.textContent = String(score).padStart(6, '0');
            if (score > 0) this.elements.highScoreDisplay.style.textShadow = "0 0 10px #ff8c00";
        }
    },
    
    updateHealth(health) {
        if (!this.elements.healthDisplay) return;
        const pct   = Math.max(0, Math.min(100, health));
        const color = pct > 60 ? '#00ff88' : pct > 30 ? '#ffcc00' : '#ff2200';
        const blink = pct < 15 ? `animation: blink 0.4s infinite;` : '';
        this.elements.healthDisplay.innerHTML = `
            <div style="
                display:flex; align-items:center; gap:6px;
                font-family:monospace; font-size:11px; color:${color};">
                <span style="letter-spacing:1px">⚡</span>
                <div style="
                    width:90px; height:12px;
                    background:#111; border:1px solid #444;
                    border-radius:2px; overflow:hidden; position:relative;">
                    <div style="
                        width:${pct}%;
                        height:100%;
                        background:linear-gradient(90deg,${color}88,${color});
                        transition:width 0.3s;
                        ${blink}"></div>
                </div>
                <span style="color:${color};min-width:34px">${Math.floor(pct)}%</span>
            </div>`;
    },
    
    updateMode(modeIndex) {
        if (!this.elements.modeDisplay) return;
        const isWalk = modeIndex === 0;
        this.elements.modeDisplay.textContent = isWalk ? 'CAMINHADA' : 'ASTERISCO';
        this.elements.modeDisplay.style.color = isWalk ? '#0ff' : '#f0f';
    },

    updateChunks(count) {
        if (this.elements.chunksDisplay) this.elements.chunksDisplay.textContent = count;
    },

    updateCooldown() {
        if (!this.elements.cooldownBar || typeof GAME === 'undefined') return;
        const activeCfg = (typeof getActiveConfig === 'function') ? getActiveConfig() : null;
        if (!activeCfg) return;

        const cd = activeCfg.gameplay.modeSwitchCooldown;
        const elapsed = GAME.frameCount - GAME.lastModeSwitch;
        if (elapsed < cd) {
            this.elements.cooldownBar.classList.add('active');
            this.elements.cooldownFill.style.width = `${((cd - elapsed) / cd) * 100}%`;
        } else {
            this.elements.cooldownBar.classList.remove('active');
        }
    },

    setStatus(status, type = 'ok') {
        if (this.elements.statusDisplay) {
            this.elements.statusDisplay.textContent = status.toUpperCase();
            this.elements.statusDisplay.className = `info-value status-${type}`;
        }
    },

    // ✅ ESSENCIAL: Re-adicionado para as Gemas e Power-ups não travarem o jogo
    showNotification(text, duration = 800) {
        const notif = this.elements.modeNotification;
        if (!notif) return;
        const textEl = notif.querySelector('.notif-text');
        if (textEl) textEl.textContent = text;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), duration);
    },

    showModeChange(modeName) {
        this.showNotification(modeName, 800);
    }
};

window.UIController = UIController;
window.updateUI = () => UIController.update();
document.addEventListener('DOMContentLoaded', () => UIController.init());