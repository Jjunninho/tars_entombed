// ARQUIVO: js/character.js
// 🛡️ FÍSICA BLINDADA v5.1 - Integrada com GameConfig

const player = {
    x: 100, 
    y: 200,
    width: 30, 
    height: 55,
    velX: 0, 
    velY: 0,
    onGround: false,
    angle: 0,
    transformProgress: 0,
    modeIndex: 0, // 0 = Walk, 1 = Roll
	jumpCount: 0,      // Conta: 0 (chão), 1 (ar), 2 (pulo duplo)
    canJumpKey: true   // Trava para exigir que solte a tecla
};

// Atalho para leitura (será atualizado dinamicamente)
function getModeConfig(index) {
    if (typeof GameConfig === 'undefined') return null;
    return index === 0 ? GameConfig.ACTIVE.modes.walk : GameConfig.ACTIVE.modes.roll;
}

// ============================================================
// LÓGICA DE FÍSICA E MOVIMENTO
// ============================================================

function updatePlayerPhysics(keys, platforms, pipes, gravity) { // Pode manter 'pipes' no argumento para não quebrar chamadas antigas, mas não usamos
    // Ler configuração GLOBAL
    const mode = getModeConfig(player.modeIndex);
    if (!mode) return; // Segurança

    player.transformProgress = mode.transformProgress;

    // ============================================================
    // 1. MOVIMENTO HORIZONTAL (INPUTS)
    // ============================================================
    if (keys['ArrowRight']) {
        player.velX = mode.speed;
        player.angle += player.modeIndex === 1 ? 0.2 : 0.15; 
    } else if (keys['ArrowLeft']) {
        player.velX = -mode.speed;
        player.angle -= player.modeIndex === 1 ? 0.2 : 0.15;
    } else {
        player.velX = 0;
        // Se estiver em modo caminhada, volta o ângulo para o "em pé" mais próximo
        if (player.modeIndex === 0) {
            const target = Math.round(player.angle / (Math.PI/2)) * (Math.PI/2);
            player.angle += (target - player.angle) * 0.05;
        }
    }

    // ============================================================
    // 2. SISTEMA DE PULO DUPLO (CORRIGIDO)
    // ============================================================
    
    // Resetar pulos se tocar no chão
    if (player.onGround) {
        player.jumpCount = 0;
    }

    // Detectar se a tecla foi solta (para evitar "pulo metralhadora")
    if (!keys['ArrowUp']) {
        player.canJumpKey = true;
    }

    // Processar o Input de Pulo
    if (keys['ArrowUp'] && player.canJumpKey) {
        
        // Pulo 1: Do chão
        if (player.onGround) {
            player.velY = mode.jumpStrength;
            player.onGround = false;
            player.jumpCount = 1;
            player.canJumpKey = false; // Trava a tecla
            
            if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('jump');
        }
        // Pulo 2: No ar (Double Jump)
        else if (player.jumpCount < 2) {
            // O segundo pulo é 90% da força para controle fino
            player.velY = mode.jumpStrength * 0.9; 
            player.jumpCount = 2;
            player.canJumpKey = false; // Trava a tecla
            
            // Som e Efeito Visual
            if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('double_jump'); 
            
            if (typeof EntitiesSystem !== 'undefined' && typeof EntitiesSystem.createExplosion === 'function') {
                const color = player.modeIndex === 0 ? '#0ff' : '#f0f';
                EntitiesSystem.createExplosion(player.x + player.width/2, player.y + player.height, color, 8);
            }
        }
    }

    // ============================================================
    // 3. FÍSICA E COLISÃO (PADRÃO)
    // ============================================================
    
    // Aplicar Gravidade
    player.velY += gravity; 

    // Movimento Y + Colisão
    player.y += player.velY;
    checkMovementCollision(platforms, false); // false = checar Y

    // Movimento X + Colisão
    player.x += player.velX;
    checkMovementCollision(platforms, true);  // true = checar X

    // (Código dos CANOS/PIPES removido pois é legado v1.0)
}

// ============================================================
// SISTEMA DE COLISÃO DE MOVIMENTO (FRAME A FRAME)
// ============================================================

function checkMovementCollision(platforms, isX) {
    if (!isX) player.onGround = false; 
    for (let p of platforms) {
        if (player.x + player.width > p.x && player.x < p.x + p.w &&
            player.y + player.height > p.y && player.y < p.y + p.h) {
            if (isX) {
                if (player.velX > 0) player.x = p.x - player.width;
                else if (player.velX < 0) player.x = p.x + p.w;
                player.velX = 0;
            } else {
                if (player.velY > 0) { player.y = p.y - player.height; player.velY = 0; player.onGround = true; if(player.velY > 5 && typeof AudioSynth !== 'undefined') AudioSynth.playSound('land'); }
                else if (player.velY < 0) { player.y = p.y + p.h; player.velY = 0; }
            }
        }
    }
}

// ============================================================
// 🧱 RESOLUÇÃO ESTÁTICA - MTV (MINIMUM TRANSLATION VECTOR)
// Usado exclusivamente durante a transformação para evitar catapultas
// ============================================================

function resolveStaticCollision(platforms) {
    // Iteramos para garantir que resolvemos múltiplas sobreposições se necessário
    // (Geralmente 1 passada resolve caixas simples)
    let hasCollision = false;
    for (let p of platforms) {
        if (player.x + player.width > p.x && player.x < p.x + p.w &&
            player.y + player.height > p.y && player.y < p.y + p.h) {
            hasCollision = true;
            const overlapLeft = (player.x + player.width) - p.x;
            const overlapRight = (p.x + p.w) - player.x;
            const overlapTop = (player.y + player.height) - p.y;
            const overlapBottom = (p.y + p.h) - player.y;
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapTop) { player.y = p.y - player.height; player.velY = 0; player.onGround = true; } 
            else if (minOverlap === overlapBottom) { player.y = p.y + p.h; player.velY = 0; }
            else if (minOverlap === overlapLeft) { player.x = p.x - player.width; player.velX = 0; }
            else if (minOverlap === overlapRight) { player.x = p.x + p.w; player.velX = 0; }
        }
    }
    return hasCollision;
}
// ============================================================
// SISTEMA DE TRANSFORMAÇÃO (DETERMINÍSTICO)
// ============================================================

function setPlayerDimensions(newWidth, newHeight, platforms) {
    const groundY = player.y + player.height;
    const centerX = player.x + player.width / 2;
    player.width = newWidth;
    player.height = newHeight;
    player.x = centerX - (player.width / 2);
    player.y = groundY - player.height;
    player.velY = 0;
    resolveStaticCollision(platforms);
}

function togglePlayerMode(platforms) {
    if (player.modeIndex === 0) {
        switchToRoll(platforms); 
    } else {
        switchToWalk(platforms);
    }
}

function switchToWalk(platforms) {
    const walkConfig = GameConfig.ACTIVE.modes.walk;
    
    // Predição usando config global
    if (checkCeilingCollision(player.x, player.y, walkConfig.width, walkConfig.height, platforms)) {
        showFeedback("ESPAÇO INSUFICIENTE!", "red");
        return; 
    }

    player.modeIndex = 0;
    // Usa dimensões do config global
    setPlayerDimensions(walkConfig.width, walkConfig.height, platforms);
    updateUIButtons();
}

function switchToRoll(platforms) {
    const rollConfig = GameConfig.ACTIVE.modes.roll;
    player.modeIndex = 1;
    // Usa dimensões do config global
    setPlayerDimensions(rollConfig.width, rollConfig.height, platforms);
    updateUIButtons();
}

function checkCeilingCollision(x, y, w, h, platforms) {
    // Onde a cabeça estaria se eu me transformasse agora?
    // Calculado a partir dos pés atuais
    const currentFeet = y + player.height;
    const newY = currentFeet - h;
    
    if (platforms) {
        for (let p of platforms) {
            if (x + w > p.x && x < p.x + p.w &&
                newY + h > p.y && newY < p.y + p.h) {
                return true;
            }
        }
    }
    return false;
}

function showFeedback(text, color) {
    const hint = document.getElementById('interactionHint') || createHintElement();
    hint.innerHTML = `<span style='color:${color}'>${text}</span>`;
    hint.style.display = 'block';
    hint.style.opacity = '1';
    setTimeout(() => hint.style.opacity = '0', 1000);
}

function createHintElement() {
    const el = document.createElement('div');
    el.id = 'interactionHint';
    el.style.position = 'absolute';
    el.style.top = '40%';
    el.style.left = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.fontSize = '20px';
    el.style.fontWeight = 'bold';
    el.style.textShadow = '2px 2px 0 #000';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '100';
    document.body.appendChild(el);
    return el;
}

function updateUIButtons() {
    const walkBtn = document.getElementById('walkBtn');
    const rollBtn = document.getElementById('rollBtn');
    const modeDisplay = document.getElementById('modeDisplay');

    if (player.modeIndex === 0) {
        if(walkBtn) walkBtn.classList.add('active');
        if(rollBtn) rollBtn.classList.remove('active');
        if(modeDisplay) {
            modeDisplay.innerText = 'CAMINHADA';
            modeDisplay.style.color = '#0ff';
        }
    } else {
        if(rollBtn) rollBtn.classList.add('active');
        if(walkBtn) walkBtn.classList.remove('active');
        if(modeDisplay) {
            modeDisplay.innerText = 'ASTERISCO';
            modeDisplay.style.color = '#f0f';
        }
    }
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================

function drawDetailedBlock(ctx, w, h, isScreen) {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#333');
    grad.addColorStop(0.2, '#666');
    grad.addColorStop(0.5, '#444');
    grad.addColorStop(1, '#222');
    ctx.fillStyle = grad;
    ctx.fillRect(-w/2, -h/2, w, h);
    
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w/2, -h/2, w, h);

    if (isScreen) {
        ctx.fillStyle = '#000';
        ctx.fillRect(-w/2 + 2, -h/2 + 10, w-4, 15);
        ctx.fillStyle = '#0f0';
        ctx.font = '8px monospace';
        ctx.fillText('90%', -w/2 + 4, -h/2 + 20);
    }
}

function drawTARS(ctx, frameCount) {
    // Efeito de Piscar: Se foi atingido recentemente, pula o desenho em frames alternados
    if (GAME.recentlyHit && frameCount % 4 < 2) {
        return; // Não desenha o TARS neste frame (cria o efeito de transparência/pisca)
    }
	
    const cx = player.x + player.width/2;
    const cy = player.y + player.height/2;

    ctx.save();
    ctx.translate(cx, cy);

    const numBlocks = 4;
    const blockW = 12;
    const blockH = 55;
    const t = player.transformProgress;
    const globalRotation = player.angle * t;
    ctx.rotate(globalRotation);

    const lerp = (a, b, step) => a + (b - a) * step;

    for (let i = 0; i < numBlocks; i++) {
        ctx.save();

        let startX = (i - 1.5) * (blockW + 2); 
        let startY = -12; 
        
        if (t < 0.3 && Math.abs(player.velX) > 0.1) {
            const walkCycle = Math.sin(frameCount * 0.2) * 4;
            if (i === 0 || i === 3) startY += walkCycle;
            else startY -= walkCycle;
        }

        const baseAngle = (i * (Math.PI / 2));
        const endAngle = baseAngle + (Math.PI / 4);
        const currentBlockAngle = lerp(0, endAngle, t);
        
        ctx.rotate(currentBlockAngle);
        
        if (t < 0.5) {
            const xPos = startX * (1 - t * 2);
            const yPos = startY * (1 - t * 2);
            ctx.translate(xPos, yPos);
        } else {
            const wheelRadius = 15;
            const radialProgress = (t - 0.5) * 2;
            const distance = lerp(0, wheelRadius, radialProgress);
            ctx.translate(0, -distance);
        }

        drawDetailedBlock(ctx, blockW, blockH, i === 1);
        ctx.restore();
    }
    
    if (t > 0.2) {
        ctx.fillStyle = `rgba(20,20,20,${t})`;
        ctx.beginPath();
        ctx.arc(0, 0, 5 * t, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();
}