// ARQUIVO: js/mobile-joystick.js
// 🕹️ JOYSTICK VIRTUAL PARA TARS ENTOMBED v2.0
// Eixo deslizante para esquerda/direita + botões de ação

const MobileJoystick = {
    active: false,

    // Estado interno do joystick
    joystickStartX: 0,
    joystickActive: false,
    deadzone: 20, // pixels mínimos para ativar direção

    init() {
        if (!('ontouchstart' in window)) return;
        this.active = true;
        this.injectStyles();
        this.render();
        this.bindJoystick();
        console.log("🕹️ Mobile Joystick v2.0 Ativado!");
    },

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* ── Layout geral ─────────────────────────────── */
            .mobile-controls {
                position: fixed;
                bottom: 20px;
                left: 0;
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                padding: 0 16px;
                z-index: 1000;
                pointer-events: none;
            }

            /* ── Zona do Joystick (esquerda) ──────────────── */
            .joystick-zone {
                position: relative;
                width: 160px;
                height: 80px;
                background: rgba(0, 255, 255, 0.07);
                border: 2px solid rgba(0, 255, 255, 0.3);
                border-radius: 40px;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            /* Trilha (track) do eixo */
            .joystick-track {
                position: absolute;
                width: 60%;
                height: 3px;
                background: rgba(0, 255, 255, 0.2);
                border-radius: 2px;
            }

            /* Setas indicativas */
            .joystick-arrow {
                position: absolute;
                font-size: 18px;
                color: rgba(0, 255, 255, 0.4);
                pointer-events: none;
                transition: color 0.1s;
            }
            .joystick-arrow.left  { left: 10px; }
            .joystick-arrow.right { right: 10px; }
            .joystick-arrow.active { color: #0ff; }

            /* Bolinha (knob) */
            .joystick-knob {
                width: 52px;
                height: 52px;
                background: radial-gradient(circle at 35% 35%, rgba(0,255,255,0.6), rgba(0,180,180,0.3));
                border: 2px solid #0ff;
                border-radius: 50%;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                box-shadow: 0 0 12px rgba(0, 255, 255, 0.5);
                transition: background 0.1s;
                pointer-events: none;
            }
            .joystick-knob.pressing {
                background: radial-gradient(circle at 35% 35%, rgba(0,255,255,0.9), rgba(0,200,200,0.6));
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.9);
            }

            /* ── Botões de ação (direita) ─────────────────── */
            .action-btns {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 10px;
                pointer-events: auto;
            }

            .action-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .joy-btn {
                width: 68px;
                height: 68px;
                background: rgba(0, 255, 255, 0.15);
                border: 2px solid #0ff;
                border-radius: 50%;
                color: #0ff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                user-select: none;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                pointer-events: auto;
                transition: background 0.1s, box-shadow 0.1s;
            }
            .joy-btn:active,
            .joy-btn.pressing {
                background: rgba(0, 255, 255, 0.45);
                box-shadow: 0 0 16px rgba(0, 255, 255, 0.7);
            }

            /* Botão MODO – roxo */
            #btn-space {
                border-color: #f0f;
                color: #f0f;
                background: rgba(255, 0, 255, 0.15);
                border-radius: 14px;
                width: 76px;
                font-size: 13px;
                letter-spacing: 1px;
            }
            #btn-space:active, #btn-space.pressing {
                background: rgba(255, 0, 255, 0.45);
                box-shadow: 0 0 16px rgba(255, 0, 255, 0.7);
            }

            /* Botão L – menor, amarelo */
            #btn-l {
                width: 44px;
                height: 44px;
                font-size: 16px;
                border-color: #ff0;
                color: #ff0;
                background: rgba(255, 255, 0, 0.12);
                border-radius: 10px;
            }
            #btn-l:active, #btn-l.pressing {
                background: rgba(255, 255, 0, 0.4);
                box-shadow: 0 0 12px rgba(255, 255, 0, 0.7);
            }
        `;
        document.head.appendChild(style);
    },

    render() {
        const container = document.createElement('div');
        container.className = 'mobile-controls';
        container.id = 'mobileControls';
        container.innerHTML = `
            <!-- Joystick deslizante (esquerda) -->
            <div class="joystick-zone" id="joystickZone">
                <div class="joystick-track"></div>
                <div class="joystick-arrow left"  id="arrowLeft">◀</div>
                <div class="joystick-arrow right" id="arrowRight">▶</div>
                <div class="joystick-knob" id="joystickKnob"></div>
            </div>

            <!-- Botões de ação (direita) -->
            <div class="action-btns">
                <div class="action-row">
                    <div class="joy-btn" id="btn-l">L</div>
                    <div class="joy-btn" id="btn-space">MODO</div>
                </div>
                <div class="action-row">
                    <div class="joy-btn" id="btn-up">↑</div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        // Botões simples
        this.bindBtn('btn-up',    'ArrowUp');
        this.bindBtn('btn-space', ' ');
        this.bindBtn('btn-l',     'l');
    },

    // ── Joystick deslizante ─────────────────────────────────────
    bindJoystick() {
        const zone  = document.getElementById('joystickZone');
        const knob  = document.getElementById('joystickKnob');
        const arrL  = document.getElementById('arrowLeft');
        const arrR  = document.getElementById('arrowRight');

        const zoneW  = 160;
        const knobRange = (zoneW / 2) - 30; // máximo de deslocamento do knob

        const reset = () => {
            keys['ArrowLeft']  = false;
            keys['ArrowRight'] = false;
            knob.style.left = '50%';
            knob.style.transform = 'translateX(-50%)';
            knob.classList.remove('pressing');
            arrL.classList.remove('active');
            arrR.classList.remove('active');
            this.joystickActive = false;
        };

        const move = (touchX) => {
            const rect  = zone.getBoundingClientRect();
            const relX  = touchX - rect.left - rect.width / 2; // relativo ao centro
            const clamped = Math.max(-knobRange, Math.min(knobRange, relX));

            // Posiciona o knob visualmente
            knob.style.left = `calc(50% + ${clamped}px)`;
            knob.style.transform = 'translateX(-50%)';
            knob.classList.add('pressing');

            if (relX < -this.deadzone) {
                keys['ArrowLeft']  = true;
                keys['ArrowRight'] = false;
                arrL.classList.add('active');
                arrR.classList.remove('active');
            } else if (relX > this.deadzone) {
                keys['ArrowRight'] = true;
                keys['ArrowLeft']  = false;
                arrR.classList.add('active');
                arrL.classList.remove('active');
            } else {
                // Deadzone: para o personagem
                keys['ArrowLeft']  = false;
                keys['ArrowRight'] = false;
                arrL.classList.remove('active');
                arrR.classList.remove('active');
            }
        };

        zone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.joystickActive = true;
            if (typeof AudioSynth !== 'undefined') AudioSynth.init();
            move(e.touches[0].clientX);
        }, { passive: false });

        zone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.joystickActive) move(e.touches[0].clientX);
        }, { passive: false });

        zone.addEventListener('touchend',    (e) => { e.preventDefault(); reset(); }, { passive: false });
        zone.addEventListener('touchcancel', (e) => { e.preventDefault(); reset(); }, { passive: false });
    },

    // ── Botões simples (pressionar / soltar) ────────────────────
    bindBtn(elementId, keyCode) {
        const btn = document.getElementById(elementId);
        if (!btn) return;

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[keyCode] = true;
            btn.classList.add('pressing');

            if (keyCode === ' ') {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            }
            if (keyCode === 'l') {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
            }

            if (typeof AudioSynth !== 'undefined') AudioSynth.init();
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[keyCode] = false;
            btn.classList.remove('pressing');
        }, { passive: false });

        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            keys[keyCode] = false;
            btn.classList.remove('pressing');
        }, { passive: false });
    }
};

// Auto-inicialização
document.addEventListener('DOMContentLoaded', () => MobileJoystick.init());
