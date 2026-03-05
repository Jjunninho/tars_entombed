// ARQUIVO: js/main.js - VERSÃO 5.2 (CORRIGIDA)
// ✅ COM SISTEMA DE ENTIDADES E CONFIGURAÇÃO CENTRALIZADA

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

console.log('🎮 TARS: Descida Infinita Entombed v5.2');
console.log('✅ Sistema de Entidades Ativado!');

// ============================================================
// ESTADO GLOBAL DO JOGO (GAME)
// ============================================================

const GAME = {
	seed: 0,
    rng: null, // O gerador principal
    cameraY: 0,
    depth: 0,
    score: 0,
    health: 3,
    frameCount: 0,
    paused: false,
    lastModeSwitch: 0,
    activePowerUps: {},
    recentlyHit: false,
    limparUses: 3,          // usos de L restantes por vida
    limparCooldown: 0,      // frame em que pode usar novamente
	lastDepthPoint: 0,
	//Salvar
	highScore: 0,
    bestSeed: 0
};

// Motor de Aleatoriedade Determinística
function createPRNG(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Funções para persistentência e salvamento

// 2. Adicione estas funções LOGO ABAIXO do objeto GAME
function loadGameData() {
    try {
        const saved = localStorage.getItem('tars_save_v1');
        if (saved) {
            const data = JSON.parse(saved);
            GAME.highScore = data.highScore || 0;
            GAME.bestSeed = data.bestSeed || 0;
            console.log(`💾 Dados carregados! Recorde: ${GAME.highScore} (Seed: ${GAME.bestSeed})`);
        }
    } catch (e) {
        console.warn('⚠️ Não foi possível carregar o save:', e);
    }
}

function saveGameData() {
    try {
        // Só salva se bater o recorde
        if (GAME.score > GAME.highScore) {
            GAME.highScore = GAME.score;
            GAME.bestSeed = GAME.seed; // Salva a Seed do recorde!
            
            const data = {
                highScore: GAME.highScore,
                bestSeed: GAME.bestSeed
            };
            localStorage.setItem('tars_save_v1', JSON.stringify(data));
            
            // Atualiza UI imediatamente
            if (typeof UIController !== 'undefined') {
                UIController.updateHighScore(GAME.highScore);
            }
            console.log('💾 Novo recorde salvo!');
        }
    } catch (e) {
        console.warn('⚠️ Erro ao salvar:', e);
    }
}


// ============================================================
// CONFIGURAÇÃO (Helper)
// ============================================================

function getActiveConfig() {
    // Fallback seguro caso GameConfig não carregue
    if (typeof GameConfig === 'undefined') return { 
        physics: { gravity: 0.5 }, 
        gameplay: { 
            modeSwitchCooldown: 10, 
            chunkHeight: 520, 
            mazeWidth: 20, 
            mazeHeight: 13, 
            tileSize: 40 
        } 
    };
    return GameConfig.ACTIVE;
}

// ============================================================
// VERIFICAÇÃO DE DEPENDÊNCIAS
// ============================================================

if (typeof EntombedEngine === 'undefined') {
    console.error('❌ ERRO: EntombedEngine não carregado!');
}

if (typeof EntitiesSystem === 'undefined') {
    console.warn('⚠️ AVISO: EntitiesSystem não carregado - sem gemas/power-ups');
}

// ============================================================
// SISTEMA BIOMAS
// ============================================================
function getCurrentBiome() {
    const meters = Math.floor(GAME.cameraY / 10);
    // Procura o bioma onde os metros estão entre o início (start) e o fim (end)
    // Multiplicamos por 10 porque a escala do bioma no data parece ser em "unidades de profundidade"
    const biome = BIOMES.find(b => meters >= b.start * 10 && meters <= b.end * 10);
    
    // Se não achar (passou do fim da lista), retorna o último bioma
    return biome || BIOMES[BIOMES.length - 1];
}


// ============================================================
// SISTEMA DE CHUNKS INFINITOS
// ============================================================

let chunks = [];
let allPlatforms = [];
let allGems = [];
let allPowerUps = [];
let allObstacles = [];
let allEnemies = [];
let nextChunkY = 0;

function convertMazeToPlatforms(maze, startY, chunkId) {
    const platforms = [];
    // ✅ CORREÇÃO: Usar getActiveConfig
    const cfg = getActiveConfig().gameplay;
    const tileSize = cfg.tileSize;

    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 1) {
                const px = x * tileSize;
                const py = startY + (y * tileSize);
                
                let width = tileSize;
                let nextX = x + 1;
                while (nextX < maze[y].length && maze[y][nextX] === 1) {
                    width += tileSize;
                    nextX++;
                }
                
                platforms.push({
                    x: px, y: py, w: width, h: tileSize,
                    chunkId: chunkId,
                    type: 'entombed'
                });
                
                x = nextX - 1;
            }
        }
    }
    return platforms;
}

function generateChunk(startY) {
    const cfg = getActiveConfig().gameplay;
    const chunkId = Math.floor(startY / cfg.chunkHeight);
    
    // 🎲 A SEED DO CHUNK: Isolamento total para determinismo
    const chunkSeed = GAME.seed + chunkId;
    const chunkRNG = createPRNG(chunkSeed);

    // Verifica se este chunk deve ser uma arena de boss
    if (typeof BossSystem !== 'undefined' && BossSystem.shouldTrigger(chunkId)) {
        return BossSystem.generateArena(startY, chunkId);
    }

    const chunk = { 
        id: chunkId,
        y: startY,
        platformsCaminhada: [],
        platformsAsterisco: [],
        gems: [],
        powerUps: [],
        obstacles: [],
        decorations: []   // 🎨 Elementos visuais decorativos
    };
    
    // ✅ CORREÇÃO: Substituir todas as CONFIG.* por cfg.*
    let prevRow = Array(cfg.mazeWidth).fill(1);
    const center = Math.floor(cfg.mazeWidth / 2);
    prevRow[center - 1] = 0;
    prevRow[center] = 0;
    prevRow[center + 1] = 0;
    
    const mazeCaminhada = [];
    const mazeAsterisco = [];
    
    for (let y = 0; y < cfg.mazeHeight; y++) {
        const rowBase = [];
        const halfWidth = Math.floor(cfg.mazeWidth / 2);
        
        for (let x = 0; x < halfWidth; x++) {
            if (x === 0) { 
                rowBase.push(1); 
                continue; 
            }
            
            const bits = [
                x - 2 >= 0 ? rowBase[x - 2] : 1,
                x - 1 >= 0 ? rowBase[x - 1] : 1,
                x - 1 >= 0 ? prevRow[x - 1] : 1,
                prevRow[x],
                x + 1 < cfg.mazeWidth ? prevRow[x + 1] : 1
            ];
            
            rowBase.push(EntombedEngine.getLookupAction(bits, chunkRNG, 'balanced'));
        }

        const rowCaminhadaLeft = [...rowBase];
        const rowAsteriscoLeft = [...rowBase];

        let corridorIdx = -1;
        for (let i = 0; i < prevRow.length - 1; i++) {
            if (prevRow[i] === 0 && prevRow[i + 1] === 0) {
                corridorIdx = i; 
                break;
            }
        }
        if (corridorIdx !== -1 && corridorIdx < rowAsteriscoLeft.length) {
            rowAsteriscoLeft[corridorIdx] = 0;
            if (corridorIdx + 1 < rowAsteriscoLeft.length) {
                rowAsteriscoLeft[corridorIdx + 1] = 0;
            }
        }

        const finalRowCaminhada = [...rowCaminhadaLeft];
        for (let x = halfWidth; x < cfg.mazeWidth; x++) {
            const mirrorX = cfg.mazeWidth - 1 - x;
            if (mirrorX >= 0 && mirrorX < rowCaminhadaLeft.length) {
                finalRowCaminhada.push(rowCaminhadaLeft[mirrorX]);
            } else {
                finalRowCaminhada.push(1);
            }
        }

        const finalRowAsterisco = [...rowAsteriscoLeft];
        for (let x = halfWidth; x < cfg.mazeWidth; x++) {
            const mirrorX = cfg.mazeWidth - 1 - x;
            if (mirrorX >= 0 && mirrorX < rowAsteriscoLeft.length) {
                finalRowAsterisco.push(rowAsteriscoLeft[mirrorX]);
            } else {
                finalRowAsterisco.push(1);
            }
        }

		// =======================================================
        // Garante bordas laterais finas e elegantes (1 tile)
        finalRowCaminhada[0] = 1;
        finalRowCaminhada[cfg.mazeWidth - 1] = 1;
        finalRowAsterisco[0] = 1;
        finalRowAsterisco[cfg.mazeWidth - 1] = 1;

		// ✨ SOLUÇÃO ELEGANTE ANTI-TÚNEL ("Degraus de Suporte") ✨
        // 'y % 8 === 0': Permite uma queda livre de até 8 blocos antes de forçar o jogador para o meio.
        // 'chunkRNG() < 0.05': Apenas 5% de chance de um degrau surpresa.
        if (y % 16 === 0 || chunkRNG() < 0.001) { 
            
            // Fecha o túnel lateral no modo Caminhada
            finalRowCaminhada[1] = 1;
            finalRowCaminhada[cfg.mazeWidth - 2] = 1;
            
            // No modo Asterisco (que deve ser extremamente aberto), a chance cai para apenas 30%
            if (chunkRNG() < 0.3) {
                finalRowAsterisco[1] = 1;
                finalRowAsterisco[cfg.mazeWidth - 2] = 1;
            }
        }

        mazeCaminhada.push(finalRowCaminhada);
        mazeAsterisco.push(finalRowAsterisco);
        prevRow = rowBase;
	}
    
    chunk.platformsCaminhada = convertMazeToPlatforms(mazeCaminhada, startY, chunk.id);
    chunk.platformsAsterisco = convertMazeToPlatforms(mazeAsterisco, startY, chunk.id);
    
    // ONDE MUDAR: Passe o chunkRNG para as entidades
    if (typeof EntitiesSystem !== 'undefined') {
        const basePlatforms = chunk.platformsCaminhada;
        // 🎨 Decorações geradas uma vez por chunk
        chunk.decorations = EntitiesSystem.generateDecorations(chunk, basePlatforms, chunkRNG);
        chunk.gems = EntitiesSystem.generateGems(chunk, basePlatforms, chunkRNG);
        chunk.powerUps = EntitiesSystem.generatePowerUps(chunk, basePlatforms, chunkRNG);
        chunk.obstacles = EntitiesSystem.generateObstacles(chunk, basePlatforms, chunkRNG);
		chunk.enemies = EntitiesSystem.generateEnemies(chunk, chunk.platformsCaminhada, chunkRNG);
    }
    
    return chunk;
}

function checkPlayerCollision(platforms, isX) {
    if (!isX) player.onGround = false; 

    for (let p of platforms) {
        if (isX && player.velY > 0) {
            const distDireita = Math.abs(player.x + player.width - p.x);
            const distEsquerda = Math.abs(player.x - (p.x + p.w));
            if (distDireita < 6 || distEsquerda < 6) continue;
        }

        if (player.x + player.width > p.x && player.x < p.x + p.w &&
            player.y + player.height > p.y && player.y < p.y + p.h) {
            
            if (isX) {
                if (player.velX > 0) player.x = p.x - player.width;
                else if (player.velX < 0) player.x = p.x + p.w;
                player.velX = 0;
            } else {
                if (player.velY > 0) {
                    player.y = p.y - player.height;
                    player.velY = 0;
                    player.onGround = true; 
                } else if (player.velY < 0) {
                    player.y = p.y + p.h;
                    player.velY = 0;
                }
            }
        }
    }
}

function resolveAntiClipping(platforms) {
    let closestCollision = null;
    let minOverlap = Infinity;
    
    for (let p of platforms) {
        if (player.x + player.width > p.x && player.x < p.x + p.w &&
            player.y + player.height > p.y && player.y < p.y + p.h) {
            
            const overlapY = (player.y + player.height) - p.y;
            
            if (overlapY < minOverlap && overlapY > 0) {
                minOverlap = overlapY;
                closestCollision = p;
            }
        }
    }
    
    if (closestCollision && minOverlap < 40) {
        player.y = closestCollision.y - player.height;
        player.velY = Math.min(player.velY, 0);
    }
}

// Localize no main.js a função updateChunks e altere o filtro:
function updateChunks() {
    const cfg = getActiveConfig().gameplay;

    // Pausa geração procedural enquanto boss está ativo
    if (typeof BossSystem !== 'undefined' && BossSystem.active) return;

    while (nextChunkY < GAME.cameraY + canvas.height + cfg.chunkHeight * 2) {
        const chunk = generateChunk(nextChunkY);
        chunks.push(chunk);
        nextChunkY += cfg.chunkHeight;
    }
    
    // AUMENTAMOS AQUI: Mantém 10 chunks para cima em vez de 5
    const minY = GAME.cameraY - (cfg.chunkHeight * 10); 
    
    chunks = chunks.filter(chunk => {
        const chunkTop = chunk.y;
        const chunkBottom = chunk.y + cfg.chunkHeight;
        
        // Se o chunk está dentro da zona de segurança (minY), ele permanece vivo
        if (chunk.y < minY) {
            // Só deleta se estiver REALMENTE longe
            return false;
        }
        return true;
    });
}

// ============================================================
// CONTROLES
// ============================================================

const keys = {};

window.addEventListener('keydown', e => {
    if (typeof AudioSynth !== 'undefined') AudioSynth.init();
    keys[e.key] = true;

    if (e.key === ' ') {
        e.preventDefault();
        const activeCfg = getActiveConfig(); // ✅ Agora definido corretamente aqui
        const cooldown = activeCfg.gameplay.modeSwitchCooldown;
        
        if (GAME.frameCount - GAME.lastModeSwitch >= cooldown) {
            togglePlayerMode(allPlatforms); // ✅ FIX: atualiza hitbox (width/height) + modeIndex
            GAME.lastModeSwitch = GAME.frameCount;
            
            const modeName = player.modeIndex === 0 ? 'CAMINHADA' : 'ASTERISCO';
            if (typeof UIController !== 'undefined') {
                UIController.showModeChange(modeName);
                if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('transform');
            }
        }
    }
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }

// ── LIMPAR: remove bloco imediatamente abaixo do TARS ────
    if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();

        // 🚨 NOVA TRAVA BLINDADA: Só bloqueia se existir um Boss VIVO na tela!
        const bossIsAlive = typeof BossSystem !== 'undefined' && 
                            BossSystem.currentBoss && 
                            BossSystem.currentBoss.hp > 0;

        if (bossIsAlive) {
            if (typeof UIController !== 'undefined') {
                UIController.showNotification('⚠️ BLOQUEADO NO BOSS!', 1000);
            }
            if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('hit');
            return; // Interrompe a função aqui
        }

        // Novos limites (Muito mais justos e focados em Score!)
        const LIMPAR_COOLDOWN_FRAMES = 180; // 3 segundos de recarga (era 5s)
        const CUSTO_SCORE = 1; // Custa 1 pontos em vez de matar o TARS

        // Variáveis de controle de uso
        const cooldownOk = GAME.frameCount >= GAME.limparCooldown;
        const scoreOk = GAME.score >= CUSTO_SCORE;

        if (cooldownOk && scoreOk) {
            // Pé do player + pequena margem
            const feetX = player.x + player.width  * 0.5;
            const feetY = player.y + player.height + 4;

            // Encontra plataforma imediatamente abaixo dos pés
            const target = allPlatforms.find(p =>
                feetX >= p.x && feetX <= p.x + p.w &&
                feetY >= p.y && feetY <= p.y + p.h + 2
            );

            if (target) {
                // Remove do chunk pai
                for (let chunk of chunks) {
                    chunk.platformsCaminhada = chunk.platformsCaminhada.filter(p => p !== target);
                    chunk.platformsAsterisco = chunk.platformsAsterisco.filter(p => p !== target);
                }
                // Remove da lista ativa
                allPlatforms = allPlatforms.filter(p => p !== target);

                // Aplica a nova penalidade suave (Custa Score)
                GAME.score -= CUSTO_SCORE;
                GAME.limparCooldown = GAME.frameCount + LIMPAR_COOLDOWN_FRAMES;

                if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('transform');
                if (typeof UIController !== 'undefined') {
                    UIController.showNotification(`🔧 BLOCO REMOVIDO (-${CUSTO_SCORE} PTS)`, 1200);
                }
            } else {
                if (typeof UIController !== 'undefined')
                    UIController.showNotification('⚠️ Nenhum bloco abaixo', 800);
            }
        } else {
            // Feedback de bloqueio se não puder usar
            let reason = '';
            if (!scoreOk) {
                reason = `❌ Precisa de ${CUSTO_SCORE} Pontos`;
            } else {
                const framesLeft = GAME.limparCooldown - GAME.frameCount;
                reason = `⏳ Aguarde ${Math.ceil(framesLeft / 60)}s`;
            }
            if (typeof UIController !== 'undefined')
                UIController.showNotification(reason, 900);
        }
    }
});

window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

// ============================================================
// UPDATE
// ============================================================

function update() {
    if (GAME.paused) return;
    const activeCfg = getActiveConfig(); // Pega configuração completa
    
	// No update() do main.js
	const targetCameraY = player.y - 250; 

	// Se o player subir além do topo (0), permitimos que a câmera o siga levemente 
	// ou travamos em 0 se você não quiser ver o fundo vazio acima do início.
	const minCameraY = 0; 

	GAME.cameraY += (targetCameraY - GAME.cameraY) * 0.1;

	if (GAME.cameraY < minCameraY) {
		GAME.cameraY = minCameraY;
	}
    
	// 1. Calcular a profundidade atual em metros
	const currentMeters = Math.floor(GAME.cameraY / 10);
	GAME.depth = currentMeters;

	// Sem dreno passivo — player morre por inimigos/obstáculos/boss
	if (GAME.health < 0) GAME.health = 0;
	if (GAME.health <= 0) { resetGame(); return; }

	// 2. Lógica de Pontos por Distância (1 ponto a cada 2 metros)
	if (currentMeters > GAME.lastDepthPoint) {
		const diff = currentMeters - GAME.lastDepthPoint;
		
		if (diff >= 2) { // ✅ A cada 2 metros descidos
			GAME.score += 1; 
			GAME.lastDepthPoint = currentMeters;
		}
		
		// ✅ VERIFICA RECORDE EM TEMPO REAL
        if (GAME.score > GAME.highScore) {
            saveGameData(); 
        }
	}
	
	
    // 3. Gerenciamento de Chunks
    updateChunks(); 

    // 4. Preparar Listas de Colisão
    allPlatforms = [];
    allGems = [];
    allPowerUps = [];
    allObstacles = [];
	allEnemies = [];
    
    for (let chunk of chunks) {
        if (player.modeIndex === 0) {
            allPlatforms.push(...chunk.platformsCaminhada);
        } else {
            allPlatforms.push(...chunk.platformsAsterisco);
        }
        allGems.push(...chunk.gems);
        allPowerUps.push(...chunk.powerUps);
        allObstacles.push(...chunk.obstacles);
		allEnemies.push(...(chunk.enemies || []));
    
	// Partículas
		if (typeof EntitiesSystem !== 'undefined') {
			EntitiesSystem.updateParticles(); 
		}
	}
	
// 5. FÍSICA E COLISÃO
    // ✅ CORREÇÃO: Passar gravidade do config
    updatePlayerPhysics(keys, allPlatforms, [], activeCfg.physics.gravity);
    
    // ✅✅✅ TRAVA DE SEGURANÇA DE GRID (HARD CLAMP) ✅✅✅
    // O TARS é obrigado a ficar entre a parede da esquerda (Tile 0 termina em 40px)
    // e a parede da direita (Tile 19 começa em 760px).
    
    // Trava Esquerda
    if (player.x < 40) { 
        player.x = 40; 
        player.velX = 0; 
    }
    
    // Trava Direita (760px - largura do player)
    if (player.x > 760 - player.width) { 
        player.x = 760 - player.width; 
        player.velX = 0; 
    }
    // ✅✅✅ FIM DA TRAVA ✅✅✅

    // Limite de velocidade terminal
    if (player.velY > 15) player.velY = 15;
    if (player.velY < -15) player.velY = -15;

    // Anti-Clipping (seguro)
    if (player.velY >= 0) {
        resolveAntiClipping(allPlatforms);
    }

// 6. Atualizar Entidades
// ─────────────────────────────────────────────
// Boss
// ─────────────────────────────────────────────
if (typeof BossSystem !== 'undefined') {

    BossSystem.update(player, GAME);

    // Após derrota: remove plataformas da arena para o player cair
    if (BossSystem.arenaOpen) {

        BossSystem.arenaOpen = false; // consome o sinal uma vez

        // Limpa projéteis remanescentes do boss
        if (BossSystem.projectiles) {
            BossSystem.projectiles.length = 0;
        }

        const arenaChunk = chunks.find(
            c => c.id === BossSystem.arenaChunkId
        );

        if (arenaChunk) {

            // Remove chão/plataformas da arena
            // O próximo chunk procedural assume o túnel
            arenaChunk.platformsCaminhada = [];
            arenaChunk.platformsAsterisco = [];

            console.log('🚪 Arena aberta — TARS pode continuar a descida!');
        }
    }
}

    if (typeof EntitiesSystem !== 'undefined') {
        EntitiesSystem.updateGems(allGems, player, GAME);
        EntitiesSystem.updatePowerUps(allPowerUps, player, GAME);
        EntitiesSystem.updateActivePowerUps(GAME);
        EntitiesSystem.checkObstacleCollisions(allObstacles, player, GAME);
        EntitiesSystem.updateEnemies(allEnemies, player, GAME);
    }

    // 7. Reset por Queda
    if (player.y > GAME.cameraY + canvas.height + 300) {
        resetGame();
    }
        
    GAME.frameCount++;
    
    if (typeof updateUI === 'function') {
        updateUI();
    }

}

// ============================================================
// DRAW
// ============================================================

function draw() {
    const currentBiome = getCurrentBiome(); // ✅ Pega o bioma atual

    // 1. Fundo Dinâmico
    ctx.fillStyle = currentBiome.bgStart; // ✅ Usa a cor do bioma
    ctx.fillRect(0, 0, 800, 500);
    
    // 2. Grid (com a cor do bioma, mas mais escura)
	ctx.strokeStyle = currentBiome.platformColor + '22'; // Cor do bioma bem suave
	ctx.lineWidth = 1;
	const parallaxY = (GAME.cameraY * 0.5) % 40;
    
    // Desenhar linhas horizontais com parallax
	for (let i = -parallaxY; i < 500; i += 40) {
		ctx.beginPath();
		ctx.moveTo(0, i);
		ctx.lineTo(800, i);
		ctx.stroke();
	}

	// Linhas verticais (podem ser fixas ou ter um leve movimento X)
	for (let i = 0; i < 800; i += 40) {
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i, 500);
		ctx.stroke();
	}

    // 3. Decorações de fundo (camada atrás das plataformas)
    if (typeof EntitiesSystem !== 'undefined') {
        const allDecorations = [];
        for (let chunk of chunks) {
            if (chunk.decorations) allDecorations.push(...chunk.decorations);
        }
        EntitiesSystem.drawDecorations(ctx, allDecorations, GAME.cameraY);
    }

    // 4. Plataformas Dinâmicas
    ctx.fillStyle = currentBiome.platformColor;
    ctx.strokeStyle = currentBiome.platformGlow;
    ctx.lineWidth = 2;
    
    for (let p of allPlatforms) {
        const screenY = p.y - GAME.cameraY;
        if (screenY > -100 && screenY < 600) {
            ctx.fillRect(p.x, screenY, p.w, p.h);
            ctx.strokeRect(p.x, screenY, p.w, p.h);
        }
    }

	// Partículas
	if (typeof EntitiesSystem !== 'undefined') {
        EntitiesSystem.drawParticles(ctx, GAME.cameraY);
	}
    
    // Entidades (drawEnemies aqui — UMA VEZ, fora do loop de plataformas)
    if (typeof EntitiesSystem !== 'undefined') {
        EntitiesSystem.drawObstacles(ctx, allObstacles, GAME.cameraY);
        EntitiesSystem.drawEnemies(ctx, allEnemies, GAME.cameraY);
        EntitiesSystem.drawGems(ctx, allGems, GAME.cameraY);
        EntitiesSystem.drawPowerUps(ctx, allPowerUps, GAME.cameraY);
    }
    
    // Player
    const playerScreenY = player.y - GAME.cameraY;
    const originalY = player.y;
    player.y = playerScreenY;
    
    if (typeof drawTARS === 'function') {
        drawTARS(ctx, GAME.frameCount);
    } else {
        ctx.fillStyle = '#0ff';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(player.x, player.y, player.width, player.height);
    }
    
    player.y = originalY;

    // Boss (acima do player para indicador HP ficar na frente)
    if (typeof BossSystem !== 'undefined') BossSystem.draw(ctx, GAME.cameraY);
}

// ============================================================
// GAME LOOP
// ============================================================

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function resetGame(injectedSeed = null) {
	loadGameData(); // ✅ Carrega o recorde ao iniciar/resetar
    // ✅ CORREÇÃO: Usar cfg para altura do chunk
    const cfg = getActiveConfig().gameplay;

    GAME.cameraY = 0;
    GAME.frameCount = 0;
    GAME.depth = 0;
    GAME.score = 0;
    GAME.paused = false;
    GAME.lastModeSwitch = 0;
    GAME.health = 100;
    GAME.limparUses    = 3;
    GAME.limparCooldown = 0;    // Bateria 0-100
    GAME.activePowerUps = {};
    GAME.recentlyHit = false;
	GAME.seed = injectedSeed !== null ? injectedSeed : Math.floor(Math.random() * 999999);
    
    player.x = 400;
    player.y = 100;
    player.velX = 0;
    player.velY = 0;
    player.modeIndex = 0;
    player.width = 30;
    player.height = 55;
    player.transformProgress = 0;
    player.angle = 0;
    player.onGround = false;
    
    chunks = [];
    allPlatforms = [];
    allGems = [];
    allPowerUps = [];
    allObstacles = [];
	allEnemies = [];
    nextChunkY = 0;
    
    for (let i = 0; i < 4; i++) {
        const chunk = generateChunk(nextChunkY);
        chunks.push(chunk);
        allPlatforms.push(...chunk.platformsCaminhada);
        allGems.push(...chunk.gems);
        allPowerUps.push(...chunk.powerUps);
        allObstacles.push(...chunk.obstacles);
        nextChunkY += cfg.chunkHeight; // <-- AQUI ESTAVA O ERRO DE REFERÊNCIA
    }
    
    if (typeof UIController !== 'undefined') {
        UIController.updateHealth(GAME.health);
        UIController.setStatus('ATIVO', 'ok');
        UIController.updateHighScore(GAME.highScore); // ✅ Mostra o recorde atual
		
    }
	

    const seedInput = document.getElementById('seedInput');
    if (seedInput) {
        seedInput.value = GAME.seed; 
    }
	
	// Exibir no console para compartilhamento
    console.log(`📡 MUNDO GERADO | SEED: ${GAME.seed}`);
    
    if (typeof BossSystem !== 'undefined') BossSystem.reset();
    console.log('🔄 Game resetado!');
	
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

console.log('▶️ Inicializando...');
resetGame();
gameLoop();
console.log('✅ Jogo iniciado com sistema de entidades!');
