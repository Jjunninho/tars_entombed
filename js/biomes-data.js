// ARQUIVO: js/biomes-data.js
// Biomas temáticos (mantidos do original)
const BIOMES = [
    { 
        name: 'RUÍNAS TECNOLÓGICAS', 
        start: 1, 
        end: 10, 
        color: '#0f9', 
        bgStart: '#001a33', 
        bgEnd: '#003366',
        particleColor: '#0ff',
        platformColor: '#2a4a6a',
        platformGlow: '#0ff',
        decor: ['circuit', 'panel', 'terminal'],
        difficulty: 1
    },
    { 
        name: 'FLORESTA CRISTALINA', 
        start: 11, 
        end: 20, 
        color: '#8f4', 
        bgStart: '#0a2a1a', 
        bgEnd: '#1a4a2a',
        particleColor: '#8f4',
        platformColor: '#3a6a4a',
        platformGlow: '#8f4',
        decor: ['crystal', 'vine', 'shard', 'waterfall'],
        difficulty: 2
    },
    { 
        name: 'LABIRINTO VIBRACIONAL', 
        start: 21, 
        end: 30, 
        color: '#f4f', 
        bgStart: '#1a0a2a', 
        bgEnd: '#2a1a4a',
        particleColor: '#f4f',
        platformColor: '#5a3a7a',
        platformGlow: '#f4f',
        decor: ['portal', 'energy', 'prism'],
        difficulty: 3
    },
    { 
        name: 'ABISMO GRAVITACIONAL', 
        start: 31, 
        end: 40, 
        color: '#4af', 
        bgStart: '#001022', 
        bgEnd: '#002244',
        particleColor: '#4af',
        platformColor: '#2a4a8a',
        platformGlow: '#4af',
        decor: ['void', 'orbit', 'singularity', 'waterfall'],
        difficulty: 4
    },
    { 
        name: 'NÚCLEO CÓSMICO', 
        start: 41, 
        end: 50, 
        color: '#f94', 
        bgStart: '#2a001a', 
        bgEnd: '#4a002a',
        particleColor: '#f94',
        platformColor: '#8a2a4a',
        platformGlow: '#f94',
        decor: ['star', 'nova', 'blackhole'],
        difficulty: 5
    }
];

// ============================================================
// UTILITÁRIO DE BIOMA (compartilhado por main.js, decorations.js, gems.js)
// ============================================================

/**
 * Retorna o bioma correspondente a uma profundidade em metros.
 * @param {number} meters - Math.floor(y / 10)  ou  Math.floor(GAME.cameraY / 10)
 * @returns {object} bioma ativo
 */
function getCurrentBiomeByDepth(meters) {
    return BIOMES.find(b => meters >= b.start * 10 && meters <= b.end * 10)
        || BIOMES[BIOMES.length - 1];
}
