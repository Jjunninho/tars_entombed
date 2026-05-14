// ARQUIVO: js/entombed-core.js
// Lógica pura do Algoritmo Entombed (Atari 2600)
// ✅ VERSÃO 2.0 - DENSIDADE AJUSTADA

// ============================================================
// ENTOMBED ALGORITHM - O ALGORITMO MISTERIOSO
// ============================================================

const ROOMS = [];

const ENTOMBED_LOOKUP = [
    1,1,1,1, 0,0,0,0,
    1,1,'R','R', 0,0,0,0,
    1,1,'R','R', 0,0,'R','R',
    1,1,0,0, 0,0,0,0
];

/**
 * Decide se uma célula será parede (1) ou caminho (0)
 * @param {Array} bits - Os 5 bits de contexto (vizinhos)
 * @param {Function} rng - Função de número aleatório
 * @param {Number} wallChance - Ajuste de dificuldade (opcional)
 */
function getEntombedAction(bits, rng = Math.random, wallChance = 0.55) {
    let idx = 0;
    for (let b of bits) {
        idx = (idx << 1) | b;
    }
    
    const action = ENTOMBED_LOOKUP[idx % 32];
    
	if (action === 'R') {
			return rng() < 0.5 ? 0 : 1; // Aqui ele usa o rng que passamos!
		}
		if (action === 1) {
			return rng() < wallChance ? 0 : 1;
		}
		return action;
	}

// Utilitário para números aleatórios fixos baseados em semente
function createSeededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

// ============================================================
// 🔧 EXPORTAÇÃO GLOBAL - ESSENCIAL PARA OUTROS ARQUIVOS
// ============================================================

window.EntombedEngine = {
    LOOKUP: ENTOMBED_LOOKUP,
    getAction: getEntombedAction,
    createSeededRandom: createSeededRandom,
    
    // Versão com densidade ajustável
    getLookupAction: function(bits, chunkRNG, density = 'balanced') {
        // Densidade: 'open' (0.7), 'balanced' (0.58), 'tight' (0.45)
        const wallChances = {
            'open': 0.72,      // Mais caminhos abertos
            'balanced': 0.58,  // Equilíbrio (PADRÃO)
            'tight': 0.45,     // Mais paredes
            'extreme': 0.85    // Quase sem paredes (teste)
        };
        
        const wallChance = wallChances[density] || 0.58;
        return getEntombedAction(bits, chunkRNG, wallChance);
    }
};

console.log('✅ EntombedEngine v2.0 carregado - Densidade ajustável');
