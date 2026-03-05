// ARQUIVO: js/mobile-joystick.js
// 🕹️ JOYSTICK VIRTUAL PARA TARS ENTOMBED
// Simula eventos de teclado para compatibilidade total com character.js

const MobileJoystick = {
    active: false,

    init() {
        // Detecta se é dispositivo móvel (Touch support)
        if (!('ontouchstart' in window)) return;
        
        this.active = true;
        this.injectStyles();
        this.render();
        console.log("🕹️ Mobile Joystick Ativado!");
    },

    // Injeta o CSS dinamicamente para manter o index.html limpo
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-controls {
                position: fixed;
                bottom: 20px;
                left: 0;
                width: 100%;
                display: flex;
                justify-content: space-between;
                padding: 0 20px;
                z-index: 1000;
                pointer-events: none;
            }
            .joy-btn {
                width: 70px;
                height: 70px;
                background: rgba(0, 255, 255, 0.2);
                border: 2px solid #0ff;
                border-radius: 50%;
                color: #0ff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                pointer-events: auto;
                user-select: none;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            .joy-btn:active { background: rgba(0, 255, 255, 0.5); }
            .d-pad { display: flex; gap: 15px; }
            .action-btns { display: flex; gap: 15px; }
            #btn-space { border-color: #f0f; color: #f0f; border-radius: 10px; width: 80px; }
        `;
        document.head.appendChild(style);
    },

    render() {
        const container = document.createElement('div');
        container.className = 'mobile-controls';
        container.innerHTML = `
            <div class="d-pad">
                <div class="joy-btn" id="btn-left">←</div>
                <div class="joy-btn" id="btn-right">→</div>
            </div>
            <div class="action-btns">
                <div class="joy-btn" id="btn-space">MODO</div>
                <div class="joy-btn" id="btn-up">↑</div>
            </div>
        `;
        document.body.appendChild(container);

        this.bindEvents('btn-left', 'ArrowLeft');
        this.bindEvents('btn-right', 'ArrowRight');
        this.bindEvents('btn-up', 'ArrowUp');
        this.bindEvents('btn-space', ' ');
    },

    bindEvents(elementId, keyCode) {
        const btn = document.getElementById(elementId);
        
        // Simula o pressionar da tecla no objeto global 'keys'
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[keyCode] = true;
            
            // Caso especial para o ESPAÇO (Troca de Modo) que usa keydown event listener no main.js
            if (keyCode === ' ') {
                window.dispatchEvent(new KeyboardEvent('keydown', { 'key': ' ' }));
            }
            
            // Inicializa o áudio no primeiro toque (exigência dos celulares)
            if (typeof AudioSynth !== 'undefined') AudioSynth.init();
        });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[keyCode] = false;
        });
    }
};

// Auto-inicialização
document.addEventListener('DOMContentLoaded', () => MobileJoystick.init());