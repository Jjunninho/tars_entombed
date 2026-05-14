// ARQUIVO: js/game-config.js
// ⚙️ CENTRAL DE CONFIGURAÇÃO

// Configuração Padrão (Valores Iniciais)
const ACTIVE_CONFIG = {
    physics: {
        gravity: 0.5,
        friction: 0.8
    },
    modes: {
        walk: {
            speed: 4,
            jumpStrength: -12,
            width: 30,
            height: 55,
            transformProgress: 0
        },
        roll: {
            speed: 8,
            jumpStrength: -14,
            width: 55,
            height: 25,
            transformProgress: 0.5
        }
    },
    gameplay: {
        modeSwitchCooldown: 10,
        mazeWidth: 20,
        mazeHeight: 13,
        chunkHeight: 520,
        tileSize: 40
    }
};

// Perfis de Dificuldade
const PROFILES = {
    EASY: {
        gravity: 0.4,
        walkSpeed: 4,
        walkJump: -14,
        rollJump: -16,
        cooldown: 5
    },
    NORMAL: {
        gravity: 0.5,
        walkSpeed: 4,
        walkJump: -12,
        rollJump: -14,
        cooldown: 10
    },
    HARD: {
        gravity: 0.6,
        walkSpeed: 5,
        walkJump: -11,
        rollJump: -13,
        cooldown: 15
    },
    CREATIVE: {
        gravity: 0.3,
        walkSpeed: 6,
        walkJump: -15,
        rollJump: -20,
        cooldown: 2
    }
};

function applyProfile(profileName) {
    const profile = PROFILES[profileName];
    if (!profile) return;

    console.log(`⚙️ Aplicando perfil: ${profileName}`);

    // Injetar valores no ACTIVE_CONFIG
    ACTIVE_CONFIG.physics.gravity = profile.gravity;
    
    ACTIVE_CONFIG.modes.walk.speed = profile.walkSpeed;
    ACTIVE_CONFIG.modes.walk.jumpStrength = profile.walkJump;
    
    ACTIVE_CONFIG.modes.roll.jumpStrength = profile.rollJump;
    
    ACTIVE_CONFIG.gameplay.modeSwitchCooldown = profile.cooldown;
}

// Exportar globalmente
window.GameConfig = {
    ACTIVE: ACTIVE_CONFIG, // Outros arquivos usarão GameConfig.ACTIVE
    apply: applyProfile
};