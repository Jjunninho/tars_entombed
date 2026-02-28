// ============================================================
// GERAÇÃO DE POWER-UPS POR CHUNK
// ============================================================

function generatePowerUpsForChunk(chunk, platforms, rng) {
    const powerUps = [];
    if (rng() > 0.9) { // 10% chance
        const validPlatforms = platforms.filter(p => p.type === 'entombed' && p.w > 80);
        if (validPlatforms.length === 0) return powerUps;
        
        const platform = validPlatforms[Math.floor(rng() * validPlatforms.length)];
        
        const types = [
            { name: 'speed', icon: '⚡', color: '#ff0', effect: 'velocidade 2x por 5s' },
            { name: 'jump', icon: '🚀', color: '#0ff', effect: 'super pulo por 5s' },
            { name: 'shield', icon: '🛡️', color: '#0f0', effect: 'invencível por 5s' },
            { name: 'magnet', icon: '🧲', color: '#f0f', effect: 'atrai gemas por 10s' }
        ];
        
        const type = types[Math.floor(rng() * types.length)];
        
        powerUps.push({
            id: `powerup_${chunk.id}`,
            x: platform.x + platform.w / 2,
            y: platform.y - 30,
            collected: false,
            type: type.name,
            icon: type.icon,
            // Certifique-se de que a função validateColor existe ou use apenas type.color
            color: (typeof validateColor !== 'undefined') ? validateColor(type.color) : type.color,
            effect: type.effect,
            pulse: 0
        });
    }
    return powerUps;
}

// ============================================================
// ATIVAÇÃO DE POWER-UPS
// ============================================================

function activatePowerUp(type, gameState) {
    if (!gameState.activePowerUps) gameState.activePowerUps = {};
    
    // Define a duração com base no tipo
    let duration = 5000; 
    if (type === 'magnet') duration = 10000;
    
    gameState.activePowerUps[type] = {
        active: true,
        endTime: Date.now() + duration
    };
    
    console.log(`✨ Power-up Ativado no sistema: ${type}`);
}

// ============================================================
// ATUALIZAÇÃO DE POWER-UPS
// ============================================================

function updatePowerUps(powerUps, player, gameState) {
    for (let powerUp of powerUps) {
        if (powerUp.collected) continue;
        powerUp.pulse += 0.15;
        
        const dist = Math.sqrt(
            Math.pow(player.x + player.width/2 - powerUp.x, 2) +
            Math.pow(player.y + player.height/2 - powerUp.y, 2)
        );
        
        if (dist < 30) {
            powerUp.collected = true;
            if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('powerup');
            activatePowerUp(powerUp.type, gameState);
            
            if (typeof UIController !== 'undefined') {
                UIController.showNotification(`${powerUp.icon} ${powerUp.effect}`, 1500);
            }
        }
    }
}

// ============================================================
// VERIFICAR POWER-UPS ATIVOS
// ============================================================

function updateActivePowerUps(gameState) {
    if (!gameState.activePowerUps) return;
    
    const now = Date.now();
    
    for (let type in gameState.activePowerUps) {
        if (gameState.activePowerUps[type].active) {
            if (now > gameState.activePowerUps[type].endTime) {
                gameState.activePowerUps[type].active = false;
                console.log(`⏱️ Power-up expirado: ${type}`);
            }
        }
    }
}

// ============================================================
// DESENHO DE POWER-UPS
// ============================================================

function drawPowerUps(ctx, powerUps, cameraY) {
    for (let powerUp of powerUps) {
        if (powerUp.collected) continue;
        
        const screenY = powerUp.y - cameraY;
        if (screenY < -50 || screenY > 550) continue;
        
        ctx.save();
        ctx.translate(powerUp.x, screenY);
        
        const float = Math.sin(powerUp.pulse) * 5;
        ctx.rotate(powerUp.pulse / 2);
        
        const glow = ctx.createRadialGradient(0, float, 0, 0, float, 30);
        glow.addColorStop(0, powerUp.color);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, float, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(powerUp.icon, 0, float);
        ctx.fillText(powerUp.icon, 0, float);
        
        ctx.restore();
    }
}

window.EntitiesPowerUps = {
    generatePowerUps: generatePowerUpsForChunk,
    updatePowerUps,
    updateActivePowerUps,
    drawPowerUps
};