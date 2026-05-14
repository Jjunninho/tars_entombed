// ARQUIVO: js/audio-synth.js
// 🎹 SINTETIZADOR PROCEDURAL RETRO (Web Audio API)
// Gera sons estilo Atari 2600 em tempo real sem arquivos externos.

const AudioSynth = {
    ctx: null,
    masterGain: null,
    enabled: true,
    volume: 0.3,

    // Inicializa o contexto de áudio (navegadores exigem interação do usuário)
    init() {
        if (this.ctx) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Controle de volume mestre
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            
            console.log('🎹 Sintetizador TARS Inicializado!');
        } catch (e) {
            console.error('❌ Web Audio API não suportada:', e);
        }
    },

    // Retoma o contexto se estiver suspenso (necessário no Chrome)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // GERADOR DE TONS (Ondas: sine, square, sawtooth, triangle)
    playTone(freqStart, freqEnd, duration, type = 'square', vol = 1) {
        if (!this.ctx || !this.enabled) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
        
        // Glissando (deslizar frequência)
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
        }

        // Envelope de volume (ADSR simplificado)
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    // GERADOR DE RUÍDO (Para explosões e impactos)
    playNoise(duration, vol = 1) {
        if (!this.ctx || !this.enabled) return;
        this.resume();

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Preencher com ruído branco
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    },

    // ============================================================
    // 🎵 BIBLIOTECA DE SONS DO JOGO (PRESETS)
    // ============================================================

    playSound(name) {
        if (!this.enabled) return;

        switch (name) {
            case 'jump':
                // Pulo clássico: Sobe a frequência rápido
                this.playTone(150, 600, 0.15, 'square', 0.5);
                break;
            
            case 'double_jump':
                // Pulo duplo: Mais agudo e rápido
                this.playTone(400, 900, 0.1, 'square', 0.4);
                break;

            case 'land':
                // Pouso: Ruído curto e grave
                this.playNoise(0.1, 0.4);
                this.playTone(100, 50, 0.1, 'sawtooth', 0.3);
                break;

            case 'gem':
                // Coleta: "Ping" agudo e limpo (Moeda do Mario style)
                this.playTone(1200, 1800, 0.1, 'sine', 0.6);
                setTimeout(() => this.playTone(1800, 2500, 0.1, 'sine', 0.6), 50);
                break;

            case 'transform':
                // Troca de modo: Som tecnológico/glitch
                this.playTone(200, 800, 0.2, 'sawtooth', 0.5);
                this.playTone(800, 200, 0.2, 'square', 0.5);
                break;

            case 'powerup':
                // Power-up: Subida longa e mágica
                this.playTone(300, 1500, 0.6, 'triangle', 0.5);
                // Tremolo effect simulado
                for(let i=0; i<5; i++) {
                    setTimeout(() => this.playTone(1000 + i*200, 1500, 0.1, 'sine', 0.3), i*100);
                }
                break;

            case 'hit':
                // Dano: Descida grave (Ouch!)
                this.playTone(150, 40, 0.3, 'sawtooth', 0.8);
                this.playNoise(0.2, 0.5);
                break;
            
            case 'gameover':
                // Derrota: Triste e lento
                this.playTone(300, 250, 0.3, 'triangle', 0.6);
                setTimeout(() => this.playTone(250, 200, 0.3, 'triangle', 0.6), 300);
                setTimeout(() => this.playTone(200, 100, 0.6, 'sawtooth', 0.6), 600);
                break;
        }
    }
};

// Exportar globalmente
window.AudioSynth = AudioSynth;