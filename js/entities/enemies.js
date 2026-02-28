// ====================================================
// INIMIGOS
// ====================================================

const TWO_PI = Math.PI * 2;

// Distância mínima entre inimigos ao spawnar (² para evitar sqrt)
const SPAWN_MIN_DIST_SQ = 70 * 70;

function generateEnemiesForChunk(chunk, platforms, rng) {
    const enemies = [];
    if (chunk.id < 2) return enemies;

    const enemyCount = 1 + Math.floor(chunk.id / 10);
    const validPlatforms = platforms.filter(p => p.type === 'entombed' && p.w > 100);

    for (let i = 0; i < Math.min(enemyCount, 3); i++) {
        if (validPlatforms.length === 0) break;
        const platform = validPlatforms[Math.floor(rng() * validPlatforms.length)];

        const r = rng();
        let enemyType;
        if (r < 0.45)      enemyType = 'drone';
        else if (r < 0.75) enemyType = 'flamebot';
        else if (r < 0.9)  enemyType = 'nanite';
        else               enemyType = 'sawbot';

        const coreHue = Math.floor(rng() * 360);
        const sizeVar = 0.8 + (rng() * 0.4);

        let candidate = null;

        // =============================
        // DRONE
        // =============================
        if (enemyType === 'drone') {
            candidate = {
                id: `enemy_${chunk.id}_${i}`,
                type: 'drone',
                x: platform.x + 20,
                y: platform.y - 45,
                w: 40 * sizeVar,
                h: 40 * sizeVar,
                speed: 1.5 + (chunk.id * 0.05),
                direction: rng() < 0.5 ? 1 : -1,
                platform,
                radius: 25 * sizeVar,
                coreHue,
                propellerRotation: 0,
                propellerSpeed: 0.2 + (rng() * 0.3),
                state: 'PATROL'
            };

        // =============================
        // FLAMEBOT
        // =============================
        } else if (enemyType === 'flamebot') {
            candidate = {
                id: `enemy_${chunk.id}_${i}`,
                type: 'flamebot',
                x: platform.x + 20,
                y: platform.y - 40,
                w: 36 * sizeVar,
                h: 36 * sizeVar,
                speed: 1.0 + (chunk.id * 0.03),
                direction: rng() < 0.5 ? 1 : -1,
                platform,
                bodyHue: coreHue,
                fireCooldown: 0,
                fireTimer: 0,
                state: 'PATROL'
            };

        // =============================
        // NANITE  (manso — flutua, só persegue de perto)
        // =============================
        } else if (enemyType === 'nanite') {
            candidate = {
                id: `enemy_${chunk.id}_${i}`,
                type: 'nanite',
                x: platform.x + 40,
                y: platform.y - 60,
                w: 44,
                h: 44,
                speed: 0.4 + rng() * 0.3,
                particles: 10,
                phase: rng() * TWO_PI,
                wanderAngle: rng() * TWO_PI
            };

        // =============================
        // SAWBOT
        // =============================
        } else if (enemyType === 'sawbot') {
            candidate = {
                id: `enemy_${chunk.id}_${i}`,
                type: 'sawbot',
                x: platform.x + 20,
                y: platform.y - 42,
                w: 42,
                h: 42,
                speed: 1.2 + rng(),
                direction: rng() < 0.5 ? 1 : -1,
                platform,
                rotation: 0,
                rotationSpeed: 0.22 + rng() * 0.18
            };
        }

        // ─── Anti-sobreposição ─────────────────────────────────
        if (!candidate) continue;

        const overlap = enemies.some(e => {
            const ddx = e.x - candidate.x;
            const ddy = e.y - candidate.y;
            return (ddx * ddx + ddy * ddy) < SPAWN_MIN_DIST_SQ;
        });

        if (!overlap) enemies.push(candidate);
    }

    return enemies;
}

// ====================================================
// UPDATE
// ====================================================
function updateEnemies(enemies, player, gameState) {
    const playerCX = player.x + player.width * 0.5;
    const playerCY = player.y + player.height * 0.5;

    for (let enemy of enemies) {
        // ─── 1. TRAVA DE VISIBILIDADE ───────────
        // Só processa se estiver perto da tela para economizar CPU e evitar dano fantasma
        const screenY = enemy.y - gameState.cameraY;
        if (screenY < -100 || screenY > 600) continue; 

        // ─── 2. MOVIMENTAÇÃO E COMPORTAMENTO ORIGINAL ───────────
        if (enemy.platform) {
            enemy.x += enemy.speed * enemy.direction;
            if (enemy.x <= enemy.platform.x || (enemy.x + enemy.w) >= (enemy.platform.x + enemy.platform.w)) {
                enemy.direction *= -1;
            }
        }

        // Drone: Gira hélice
        if (enemy.type === 'drone') {
            enemy.propellerRotation += enemy.propellerSpeed;
        } 
        // Flamebot: Lógica do fogo
        else if (enemy.type === 'flamebot') {
            const hDist = Math.abs(player.x - enemy.x);
            enemy.state = hDist < 150 ? 'ATTACK' : 'PATROL';
            if (enemy.state === 'ATTACK') {
                enemy.fireCooldown -= 0.016;
                if (enemy.fireCooldown <= 0) {
                    enemy.fireTimer = 0.5;
                    enemy.fireCooldown = 2.5;
                }
            }
            if (enemy.fireTimer > 0) enemy.fireTimer -= 0.016;
        }
        // Nanite: Perseguição suave
        else if (enemy.type === 'nanite') {
            const ndx = player.x - enemy.x;
            const ndy = player.y - enemy.y;
            const nDistSq = ndx * ndx + ndy * ndy;
            if (nDistSq < 130 * 130) {
                const factor = 0.003 * enemy.speed;
                enemy.x += ndx * factor;
                enemy.y += ndy * factor;
            } else {
                // determinismo leve por inimigo (seed baseada na posição inicial)
				enemy._rngSeed = (enemy._rngSeed ?? ((enemy.x * 73856093) ^ (enemy.y * 19349663)) | 0);
				enemy._rngSeed = (enemy._rngSeed * 1664525 + 1013904223) | 0;
				const r = ((enemy._rngSeed >>> 0) / 4294967296);
				enemy.wanderAngle += (r - 0.5) * 0.08;
                enemy.x += Math.cos(enemy.wanderAngle) * 0.4;
                enemy.y += Math.sin(enemy.wanderAngle) * 0.15;
            }
        }
        // Sawbot: Rotação
        else if (enemy.type === 'sawbot') {
            enemy.rotation += enemy.rotationSpeed;
        }

        // ─── 3. LÓGICA DE COLISÃO UNIFICADA E JUSTA ───────────
        const dx = playerCX - (enemy.x + enemy.w * 0.5);
        const dy = playerCY - (enemy.y + enemy.h * 0.5);
        const distSq = dx * dx + dy * dy;

        let hitRadius = 25;
        let damageValue = 20;

        // Ajustes finos de colisão por tipo
        if (enemy.type === 'drone') hitRadius = 22;
        if (enemy.type === 'nanite') hitRadius = 18;
        if (enemy.type === 'sawbot') hitRadius = 28;
        if (enemy.type === 'flamebot' && enemy.fireTimer > 0) {
            hitRadius = 40; // O fogo aumenta a área de perigo
        }

        if (distSq < (hitRadius * hitRadius)) {
            const hasShield = gameState.activePowerUps?.shield?.active;
            if (!hasShield && !gameState.recentlyHit) {
                gameState.health -= damageValue;
                gameState.recentlyHit = true;
                if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('hit');
                if (typeof UIController !== 'undefined') UIController.updateHealth(gameState.health);
                
                // Reset da invencibilidade
                setTimeout(() => { gameState.recentlyHit = false; }, 1500);
            }
        }
    }
}

// ====================================================
// DRAW
// ====================================================
function drawEnemies(ctx, enemies, cameraY) {

    const now       = Date.now();
    const floatBase = Math.sin(now * 0.005);
    const eyePulse  = Math.sin(now * 0.01);

    for (let enemy of enemies) {

        const screenY = enemy.y - cameraY;
        if (screenY < -80 || screenY > 600) continue;

        const centerX = enemy.x + enemy.w * 0.5;
        const centerY = screenY + enemy.h * 0.5 + floatBase * 5;

        ctx.save();
        ctx.translate(centerX, centerY);

        // =============================
        // DRONE
        // =============================
        if (enemy.type === 'drone') {

            const bodySize = enemy.radius * 0.6;

            ctx.fillStyle = `hsl(${enemy.coreHue},80%,60%)`;
            ctx.fillRect(-bodySize * 0.5, -bodySize * 0.5, bodySize, bodySize);

            ctx.save();
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#444';
            ctx.fillRect(-bodySize * 1.2, -4, bodySize * 2.4, 8);
            ctx.rotate(Math.PI / 2);
            ctx.fillRect(-bodySize * 1.2, -4, bodySize * 2.4, 8);
            ctx.restore();

            const offset     = bodySize;
            const propRadius = 12;
            ctx.fillStyle = 'rgba(200,255,255,0.5)';

            for (let k = 0; k < 4; k++) {
                const px = (k % 2 === 0 ?  offset : -offset);
                const py = (k < 2       ?  offset : -offset);
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(enemy.propellerRotation);
                ctx.fillRect(-propRadius, -2, propRadius * 2, 4);
                ctx.fillRect(-2, -propRadius, 4, propRadius * 2);
                ctx.restore();
            }

            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(0, 0, 4 + eyePulse, 0, TWO_PI);
            ctx.fill();

        // =============================
        // FLAMEBOT
        // =============================
        } else if (enemy.type === 'flamebot') {

            const size = enemy.w * 0.6;

            ctx.fillStyle = `hsl(${enemy.bodyHue},70%,50%)`;
            ctx.fillRect(-size * 0.5, -size * 0.5, size, size);

            ctx.fillStyle = '#333';
            ctx.fillRect(-size * 0.5, size * 0.5, 6, 10);
            ctx.fillRect( size * 0.5 - 6, size * 0.5, 6, 10);

            ctx.fillStyle = 'red';
            ctx.fillRect(-6, -4, 4, 4);
            ctx.fillRect( 2, -4, 4, 4);

            if (enemy.fireTimer > 0) {
                const flameLength = 20 + Math.sin(now * 0.02) * 5;
                const dir = enemy.direction;
                ctx.fillStyle = 'orange';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(dir * flameLength, -6);
                ctx.lineTo(dir * flameLength,  6);
                ctx.closePath();
                ctx.fill();
            }

        // =============================
        // NANITE  (manso — partículas suaves, sem beginPath por partícula)
        // =============================
        } else if (enemy.type === 'nanite') {

            const t     = now * 0.0015 + enemy.phase; // rotação lenta
            const count = enemy.particles;
            const orbit = enemy.w * 0.38;
            const pSize = 3;

            ctx.fillStyle = 'rgba(120, 240, 180, 0.7)'; // verde-menta suave

            // fillRect evita beginPath/arc por partícula
            for (let p = 0; p < count; p++) {
                const angle = (p / count) * TWO_PI + t;
                const px = Math.cos(angle) * orbit;
                const py = Math.sin(angle) * orbit * 0.45;
                ctx.fillRect(px - pSize * 0.5, py - pSize * 0.5, pSize, pSize);
            }

            // Núcleo pulsante suave
            const pulse = 4 + Math.sin(now * 0.004 + enemy.phase) * 1.5;
            ctx.fillStyle = 'rgba(80, 220, 140, 0.9)';
            ctx.beginPath();
            ctx.arc(0, 0, pulse, 0, TWO_PI);
            ctx.fill();

        // =============================
        // SAWBOT  (minimalista — estrela em path único)
        // =============================
        } else if (enemy.type === 'sawbot') {

            const Ro     = enemy.w * 0.44; // ponta da lâmina
            const Ri     = enemy.w * 0.26; // vale entre dentes
            const blades = 5;

            ctx.save();
            ctx.rotate(enemy.rotation);

            // Lâmina inteira como path único
            ctx.beginPath();
            for (let b = 0; b < blades * 2; b++) {
                const angle = (b / (blades * 2)) * TWO_PI - Math.PI * 0.5;
                const rad   = (b % 2 === 0) ? Ro : Ri;
                const bx    = Math.cos(angle) * rad;
                const by    = Math.sin(angle) * rad;
                if (b === 0) ctx.moveTo(bx, by);
                else         ctx.lineTo(bx, by);
            }
            ctx.closePath();
            ctx.fillStyle = '#b8b8b8';
            ctx.fill();
            ctx.restore();

            // Aro interno escuro
            ctx.fillStyle = '#1c1c1c';
            ctx.beginPath();
            ctx.arc(0, 0, Ri * 0.72, 0, TWO_PI);
            ctx.fill();

            // Parafuso central
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, TWO_PI);
            ctx.fill();
        }

        ctx.restore();
    }
}

// ====================================================
window.EntitiesEnemies = {
    generateEnemies: generateEnemiesForChunk,
    updateEnemies,
    drawEnemies
};
