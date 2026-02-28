/// ============================================================
// GERAÇÃO DE GEMAS POR CHUNK (COM PROTEÇÃO CONTRA TETOS)
// ============================================================

function generateGemsForChunk(chunk, platforms, rng) {
    const gems = [];
    const gemCount = 3 + Math.floor(chunk.id / 5); 
    
    const validPlatforms = platforms.filter(p => 
        p.type === 'entombed' && p.w > 60
    );
    
    if (validPlatforms.length === 0) return gems;
    
    let attempts = 0;
    while (gems.length < gemCount && attempts < 50) {
        attempts++;
        // ✅ USANDO O RNG INJETADO EM VEZ DE SEEDEDRANDOM(SEED)
        const platformIndex = Math.floor(rng() * validPlatforms.length);
        const platform = validPlatforms[platformIndex];
        
        const gemX = platform.x + platform.w / 2;
        const gemY = platform.y - 25; 
        const gemRadius = 10; 
        
        const isBuried = platforms.some(p => 
            gemX > p.x && gemX < p.x + p.w &&
            gemY - gemRadius > p.y && gemY + gemRadius < p.y + p.h
        );

        if (isBuried) continue;

        // ✅ USANDO O RNG INJETADO
        const rand = rng(); 
        let type, value, color, size, batteryRestore; // ← adicionar batteryRestore aqui
        
        if (rand > 0.95) {
            type = 'rare'; value = 100; color = '#a0f'; size = 16; batteryRestore = 40;
        } else if (rand > 0.85) {
            type = 'special'; value = 50; color = '#ff0'; size = 14; batteryRestore = 20;
        } else {
            type = 'normal'; value = 10; color = '#0ff'; size = 12; batteryRestore = 8;
        }
        
        if (!gems.some(g => Math.abs(g.x - gemX) < 10 && Math.abs(g.y - gemY) < 10)) {
            gems.push({
                id: `gem_${chunk.id}_${gems.length}`,
                x: gemX, y: gemY,
                collected: false,
                type: type, value: value,
                color: validateColor(color),
                size: size, pulse: 0,
                batteryRestore: batteryRestore || 8
            });
        }
    }
    return gems;
}

// ============================================================
// ATUALIZAÇÃO DE GEMAS (Animação)
// ============================================================

function updateGems(gems, player, gameState) {
    const hasMagnet = gameState.activePowerUps?.magnet?.active;
    const playerCX = player.x + player.width / 2;
    const playerCY = player.y + player.height / 2;
	
    for (let gem of gems) {
        if (gem.collected) continue;
        
        // 🧲 Lógica do Ímã (Power-up Magnet)
        if (hasMagnet) {
            const distToPlayer = Math.sqrt(Math.pow(playerCX - gem.x, 2) + Math.pow(playerCY - gem.y, 2));
            if (distToPlayer < 180) { // Raio de atração
                gem.x += (playerCX - gem.x) * 0.12;
                gem.y += (playerCY - gem.y) * 0.12;
            }
        }

		gem.pulse += 0.1;
		const dist = Math.sqrt(Math.pow(playerCX - gem.x, 2) + Math.pow(playerCY - gem.y, 2));
		const currentBiome = typeof getCurrentBiome === 'function' ? getCurrentBiome() : { particleColor: '#0ff' };
		const gemColor = gem.type === 'normal' ? currentBiome.particleColor : gem.color;
			
        if (dist < 25) {
            gem.collected = true;
            GAME.score += gem.value;
            // Restaura bateria do TARS
            GAME.health = Math.min(100, GAME.health + (gem.batteryRestore || 8));
            if (typeof UIController !== 'undefined') UIController.updateHealth(GAME.health);
			// Inclusão de sistema de partículas
			const currentBiome = typeof getCurrentBiome === 'function' ? getCurrentBiome() : { particleColor: '#0ff' };
			const particleColor = gem.type === 'normal' ? currentBiome.particleColor : gem.color;
    
		createExplosion(gem.x, gem.y, particleColor, 15); // Gera 15 partículas
			
			if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('gem');
			if (typeof UIController !== 'undefined') UIController.showNotification(`+${gem.value}`, 400);
        }
    }
}

// ============================================================
// DESENHO DE GEMAS
// ============================================================
function drawGems(ctx, gems, cameraY) {
    // ✅ PROTEÇÃO: Verifica se a função existe antes de chamar para evitar ReferenceError
    const currentBiome = typeof getCurrentBiome === 'function' 
        ? getCurrentBiome() 
        : { particleColor: '#0ff' }; // Fallback ciano caso o bioma não seja encontrado
    
    for (let gem of gems) {
        if (gem.collected) continue;
        
        const screenY = gem.y - cameraY;
        // Culling: Só desenha se estiver dentro da área visível do canvas
        if (screenY < -50 || screenY > 550) continue;
        
        // ✅ DEFINIÇÃO DE COR: Gemas normais herdam a cor do bioma atual
        const renderColor = gem.type === 'normal' ? currentBiome.particleColor : gem.color;
        
        ctx.save();
        ctx.translate(gem.x, screenY);
        
        // Animação de pulso baseada no tempo de frame
        const scale = 1 + Math.sin(gem.pulse) * 0.2;
        ctx.scale(scale, scale);
        
        // Brilho Radial utilizando a renderColor (dinâmica ou fixa)
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, gem.size * 2);
        glow.addColorStop(0, renderColor); // Cor central
        glow.addColorStop(0.5, renderColor); 
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Desaparece na borda
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, gem.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Gema (forma de diamante/losango)
        ctx.fillStyle = renderColor;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -gem.size);           // Topo
        ctx.lineTo(gem.size * 0.7, 0);      // Direita
        ctx.lineTo(0, gem.size);            // Baixo
        ctx.lineTo(-gem.size * 0.7, 0);     // Esquerda
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
}


window.EntitiesGems = {
    generateGems: generateGemsForChunk,
    updateGems,
    drawGems
};
