// ============================================================
// GERAÇÃO DE OBSTÁCULOS POR CHUNK
// ============================================================

function generateObstaclesForChunk(chunk, platforms, rng) {
    const obstacles = [];
    if (rng() < 0.3) {
        const validPlatforms = platforms.filter(p => p.type === 'entombed' && p.w > 100);
        for (let i = 0; i < 2; i++) {
            if (validPlatforms.length === 0) break;
            const platform = validPlatforms[Math.floor(rng() * validPlatforms.length)];
            obstacles.push({
                id: `obstacle_${chunk.id}_${i}`,
                x: platform.x + (platform.w / 2) - 20,
                y: platform.y - 15,
                w: 40, h: 15,
                type: 'spikes', damage: 1, color: '#f00'
            });
        }
    }
    return obstacles;
}

// ============================================================
// COLISÃO COM OBSTÁCULOS
// ============================================================

// ============================================================
// COLISÃO COM OBSTÁCULOS (VERSÃO CORRIGIDA)
// ============================================================

function checkObstacleCollisions(obstacles, player, gameState) {
    for (let obstacle of obstacles) {
        if (obstacle.type === 'spikes') {
            
            // ─── 1. TRAVA DE VISIBILIDADE ───────────────────────
            // Só processa colisão se o espinho estiver na tela (0 a 500px)
            const screenY = obstacle.y - gameState.cameraY;
            if (screenY < -20 || screenY > 520) continue;

            // ─── 2. AJUSTE DE HITBOX (MAIS JUSTO) ───────────────
            // Removi o "+ 5" que causava dano invisível antes do toque.
            // Agora a colisão é restrita à área visual exata do espinho.
            if (player.x + player.width > obstacle.x &&
                player.x < obstacle.x + obstacle.w &&
                player.y + player.height > obstacle.y &&
                player.y + player.height < obstacle.y + obstacle.h) {
                
                const hasShield = gameState.activePowerUps?.shield?.active;
                
                if (!hasShield && !gameState.recentlyHit) {
                    // Aplica o dano (15%)
                    gameState.health -= (obstacle.damage * 15);
                    
                    if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('hit');
                    
                    gameState.recentlyHit = true;
                    // Sincronizado com o novo tempo de invencibilidade (1.5s)
                    setTimeout(() => { gameState.recentlyHit = false; }, 1500);
                    
                    if (typeof UIController !== 'undefined') UIController.updateHealth(gameState.health);
                }
            }
        }
    }
}

// ============================================================
// DESENHO DE OBSTÁCULOS
// ============================================================

function drawObstacles(ctx, obstacles, cameraY) {
    for (let obstacle of obstacles) {
        const screenY = obstacle.y - cameraY;
        if (screenY < -50 || screenY > 550) continue;
        
        if (obstacle.type === 'spikes') {
            ctx.fillStyle = obstacle.color;
            ctx.strokeStyle = '#800';
            ctx.lineWidth = 1;
            
            // Desenhar espinhos triangulares
            const spikeCount = Math.floor(obstacle.w / 10);
            for (let i = 0; i < spikeCount; i++) {
                const x = obstacle.x + (i * 10);
                
                ctx.beginPath();
                ctx.moveTo(x, screenY + obstacle.h);
                ctx.lineTo(x + 5, screenY);
                ctx.lineTo(x + 10, screenY + obstacle.h);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    }
}

window.EntitiesObstacles = {
    generateObstacles: generateObstaclesForChunk,
    checkObstacleCollisions,
    drawObstacles
};


