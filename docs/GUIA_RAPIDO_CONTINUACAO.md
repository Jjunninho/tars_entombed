# 🚀 TARS ENTOMBED - GUIA RÁPIDO DE CONTINUAÇÃO
## Quick Start para Próximas Sessões de Desenvolvimento

---

## 🎯 ANTES DE COMEÇAR QUALQUER SESSÃO

### **1. Ler estes 2 arquivos:**
- [ ] `MANUAL_DESENVOLVEDOR_COMPLETO.md` (documento principal)
- [ ] `GUIA_RAPIDO_CONTINUACAO.md` (este arquivo)

### **2. Verificar estado do projeto:**
```bash
# Estrutura correta?
ls -la tars-entombed/
# Deve mostrar: HTML, css/, js/, docs/

# Arquivos JS presentes?
ls -la js/
# Deve ter: 8 arquivos .js
```

### **3. Testar no navegador:**
- Abrir `tars-entombed-modular.html`
- F12 → Console
- Verificar: "✅ ... carregado!" para cada módulo
- Jogar 30 segundos para confirmar que funciona

### **4. Backup antes de modificar:**
```bash
# Criar backup da versão funcional
cp -r tars-entombed/ tars-entombed-backup-$(date +%Y%m%d)
```

---

## 📋 CHECKLIST DE FEATURES PRIORITÁRIAS

### **✅ IMPLEMENTADO (v4.0)**
- [x] Chunks infinitos
- [x] Dual-reality
- [x] Física de plataforma
- [x] Sistema de transformação
- [x] Gemas (3 tipos)
- [x] Power-ups (4 tipos)
- [x] Obstáculos (espinhos)
- [x] Sistema de vida
- [x] Score dinâmico
- [x] UI em tempo real
- [x] Seletor de dificuldade
- [x] Notificações visuais

### **⏳ PRÓXIMAS FEATURES (v5.0)**
- [ ] Inimigos móveis
- [ ] Sons e música
- [ ] Partículas
- [ ] High score (localStorage)
- [ ] Parallax no fundo

### **🎯 FEATURES DE MÉDIO PRAZO (v6.0)**
- [ ] Boss fights
- [ ] Checkpoints
- [ ] Minimapa
- [ ] Pause menu
- [ ] Achievements

### **🌟 FEATURES AVANÇADAS (v7.0+)**
- [ ] Multiplayer local
- [ ] Editor de níveis
- [ ] Mobile controls
- [ ] Leaderboard online

---

## 🔧 TEMPLATES DE CÓDIGO PRONTOS

### **Template 1: Adicionar Novo Power-up**

```javascript
// ===== PASSO 1: Definir em entities-system.js =====
// Linha ~80, adicionar ao array 'types':

{
    name: 'double_jump',      // ID único
    icon: '🦘',               // Emoji visual
    color: '#f0f',            // Cor hex
    effect: 'pulo duplo por 10s',  // Descrição
    duration: 10000           // Milissegundos
}

// ===== PASSO 2: Implementar efeito em character.js =====
// Linha ~60, função updatePlayerPhysics:

function updatePlayerPhysics(keys, platforms, pipes, gravity) {
    // ...código existente...
    
    // NOVO: Sistema de pulo duplo
    const hasDoubleJump = GAME.activePowerUps?.double_jump?.active;
    
    if (keys['ArrowUp']) {
        if (player.onGround) {
            // Pulo normal
            player.velY = currentMode.jumpStrength;
            player.onGround = false;
            player.canDoubleJump = hasDoubleJump;  // Habilitar 2º pulo
        } else if (player.canDoubleJump && hasDoubleJump) {
            // Pulo duplo!
            player.velY = currentMode.jumpStrength * 0.8;
            player.canDoubleJump = false;
            
            // Feedback visual
            if (typeof createParticles === 'function') {
                createParticles(player.x, player.y, '#f0f', 5);
            }
        }
    }
    
    // ...resto do código...
}

// ===== PASSO 3: Resetar flag ao tocar o chão =====
// Ainda em updatePlayerPhysics, depois da colisão Y:

if (player.onGround) {
    player.canDoubleJump = false;  // Reset ao pousar
}

// ===== PASSO 4: Testar =====
// Console do navegador:
GAME.activePowerUps = {
    double_jump: { active: true, endTime: Date.now() + 60000 }
};
// Jogar e pressionar seta pra cima no ar!
```

---

### **Template 2: Adicionar Sistema de Som**

```javascript
// ===== ARQUIVO NOVO: js/audio-system.js =====

const AudioSystem = {
    sounds: {},
    music: null,
    enabled: true,
    volume: 0.5,
    
    init() {
        // Carregar sons
        this.sounds = {
            jump: this.loadSound('assets/sounds/jump.mp3'),
            gem: this.loadSound('assets/sounds/gem.mp3'),
            powerup: this.loadSound('assets/sounds/powerup.mp3'),
            hit: this.loadSound('assets/sounds/hit.mp3'),
            transform: this.loadSound('assets/sounds/transform.mp3'),
            death: this.loadSound('assets/sounds/death.mp3')
        };
        
        // Música de fundo
        this.music = this.loadSound('assets/music/theme.mp3', true);
        
        console.log('🔊 AudioSystem carregado!');
    },
    
    loadSound(path, loop = false) {
        const audio = new Audio(path);
        audio.volume = this.volume;
        audio.loop = loop;
        
        // Fallback se arquivo não existir
        audio.addEventListener('error', () => {
            console.warn(`⚠️ Som não encontrado: ${path}`);
        });
        
        return audio;
    },
    
    play(name) {
        if (!this.enabled) return;
        
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => {
                // Ignorar erros (autoplay policy)
            });
        }
    },
    
    playMusic() {
        if (!this.enabled || !this.music) return;
        this.music.play().catch(e => {
            console.warn('⚠️ Música bloqueada por autoplay policy');
        });
    },
    
    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
    },
    
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        
        for (let name in this.sounds) {
            this.sounds[name].volume = this.volume;
        }
        
        if (this.music) {
            this.music.volume = this.volume * 0.5;  // Música mais baixa
        }
    },
    
    toggle() {
        this.enabled = !this.enabled;
        
        if (!this.enabled) {
            this.stopMusic();
        }
        
        return this.enabled;
    }
};

window.AudioSystem = AudioSystem;

// ===== ADICIONAR NO HTML =====
// Antes do main.js:
<script src="js/audio-system.js"></script>

// ===== INICIALIZAR NO main.js =====
// Logo após resetGame():

if (typeof AudioSystem !== 'undefined') {
    AudioSystem.init();
    AudioSystem.playMusic();
}

// ===== USAR EM OUTROS ARQUIVOS =====

// character.js - ao pular:
if (keys['ArrowUp'] && player.onGround) {
    player.velY = currentMode.jumpStrength;
    AudioSystem.play('jump');  // ⭐
}

// character.js - ao trocar modo:
function togglePlayerMode() {
    // ...código...
    AudioSystem.play('transform');  // ⭐
}

// entities-system.js - ao coletar gema:
if (dist < 25) {
    gem.collected = true;
    gameState.score += gem.value;
    AudioSystem.play('gem');  // ⭐
}

// entities-system.js - ao tomar dano:
if (!hasShield) {
    gameState.health -= 1;
    AudioSystem.play('hit');  // ⭐
}
```

**Criar pasta de sons:**
```bash
mkdir -p assets/sounds assets/music

# Baixar sons grátis de:
# - freesound.org
# - opengameart.org
# - kenney.nl
```

---

### **Template 3: Sistema de Partículas Simples**

```javascript
// ===== ADICIONAR EM entities-system.js =====

// Array global de partículas
let particles = [];

// Função para criar partículas
function createParticles(x, y, color, count, type = 'default') {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            velX: (Math.random() - 0.5) * 6,
            velY: (Math.random() - 0.5) * 6 - 2,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02,
            color: color,
            size: type === 'gem' ? 6 : 3,
            gravity: type === 'gem' ? 0.15 : 0.1
        });
    }
}

// Função para atualizar partículas
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Física
        p.x += p.velX;
        p.y += p.velY;
        p.velY += p.gravity;
        
        // Vida
        p.life -= p.decay;
        
        // Remover se morta
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Função para desenhar partículas
function drawParticles(ctx, cameraY) {
    for (let p of particles) {
        const screenY = p.y - cameraY;
        
        // Culling
        if (screenY < -50 || screenY > 550) continue;
        
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size/2, screenY - p.size/2, p.size, p.size);
        ctx.restore();
    }
}

// ===== EXPORTAR =====
window.EntitiesSystem = {
    // ...funções existentes...
    createParticles,
    updateParticles,
    drawParticles
};

// ===== USAR NO main.js =====

// No update():
if (typeof EntitiesSystem !== 'undefined') {
    EntitiesSystem.updateParticles();
    // ...outras updates...
}

// No draw():
if (typeof EntitiesSystem !== 'undefined') {
    EntitiesSystem.drawParticles(ctx, GAME.cameraY);
    // ...outros draws...
}

// ===== USAR EM entities-system.js =====

// Ao coletar gema:
if (dist < 25) {
    gem.collected = true;
    createParticles(gem.x, gem.y, gem.color, 15, 'gem');  // ⭐
}

// Ao coletar power-up:
if (dist < 30) {
    powerUp.collected = true;
    createParticles(powerUp.x, powerUp.y, powerUp.color, 20, 'sparkle');  // ⭐
}

// ===== USAR EM character.js =====

// Ao pousar no chão (depois da colisão Y):
if (player.velY > 5 && player.onGround) {
    // Poeira ao pousar
    createParticles(
        player.x + player.width/2, 
        player.y + player.height, 
        '#888', 
        5, 
        'dust'
    );
}
```

---

### **Template 4: Implementar Inimigo Básico**

```javascript
// ===== PASSO 1: Gerar inimigos em entities-system.js =====

function generateEnemiesForChunk(chunk, platforms) {
    const enemies = [];
    
    // Só spawnar em chunks profundos (depois de 5)
    if (chunk.id < 5) return enemies;
    
    const seed = chunk.id * 666;
    const enemyCount = 1 + Math.floor(chunk.id / 10);  // 1-5 inimigos
    
    const validPlatforms = platforms.filter(p => 
        p.type === 'entombed' && p.w > 100
    );
    
    if (validPlatforms.length === 0) return enemies;
    
    for (let i = 0; i < Math.min(enemyCount, 3); i++) {
        const platformIndex = Math.floor(seededRandom(seed + i) * validPlatforms.length);
        const platform = validPlatforms[platformIndex];
        
        enemies.push({
            id: `enemy_${chunk.id}_${i}`,
            x: platform.x + 20,
            y: platform.y - 30,
            w: 25,
            h: 30,
            velX: 0,
            velY: 0,
            hp: 1,
            damage: 1,
            speed: 2,
            direction: 1,  // 1=direita, -1=esquerda
            ai: 'patrol',
            sprite: '🤖',
            platform: platform,
            onGround: false
        });
    }
    
    return enemies;
}

// ===== PASSO 2: Atualizar inimigos =====

function updateEnemies(enemies, player, platforms, gameState) {
    for (let enemy of enemies) {
        // AI: Patrulha
        if (enemy.ai === 'patrol') {
            enemy.x += enemy.speed * enemy.direction;
            
            // Verificar borda da plataforma
            const leftEdge = enemy.platform.x;
            const rightEdge = enemy.platform.x + enemy.platform.w;
            
            if (enemy.x < leftEdge || enemy.x + enemy.w > rightEdge) {
                enemy.direction *= -1;  // Virar
            }
        }
        
        // Gravidade
        enemy.velY += 0.5;
        enemy.y += enemy.velY;
        
        // Colisão com plataforma
        for (let p of platforms) {
            if (enemy.x + enemy.w > p.x && enemy.x < p.x + p.w &&
                enemy.y + enemy.h > p.y && enemy.y < p.y + p.h) {
                
                if (enemy.velY > 0) {
                    enemy.y = p.y - enemy.h;
                    enemy.velY = 0;
                    enemy.onGround = true;
                }
            }
        }
        
        // Colisão com player
        if (enemy.x + enemy.w > player.x && enemy.x < player.x + player.width &&
            enemy.y + enemy.h > player.y && enemy.y < player.y + player.height) {
            
            const hasShield = gameState.activePowerUps?.shield?.active;
            
            if (!hasShield && !gameState.recentlyHit) {
                // Player toma dano
                gameState.health -= enemy.damage;
                gameState.recentlyHit = true;
                
                if (typeof AudioSystem !== 'undefined') {
                    AudioSystem.play('hit');
                }
                
                setTimeout(() => {
                    gameState.recentlyHit = false;
                }, 1000);
                
                console.log('💔 Dano! Vida:', gameState.health);
            }
        }
    }
}

// ===== PASSO 3: Desenhar inimigos =====

function drawEnemies(ctx, enemies, cameraY) {
    for (let enemy of enemies) {
        const screenY = enemy.y - cameraY;
        
        if (screenY < -50 || screenY > 550) continue;
        
        ctx.save();
        ctx.translate(enemy.x + enemy.w/2, screenY + enemy.h/2);
        
        // Espelhar sprite
        if (enemy.direction === -1) {
            ctx.scale(-1, 1);
        }
        
        // Desenhar sprite emoji
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.sprite, 0, 0);
        
        ctx.restore();
    }
}

// ===== PASSO 4: Exportar =====

window.EntitiesSystem = {
    // ...existentes...
    generateEnemies: generateEnemiesForChunk,
    updateEnemies: updateEnemies,
    drawEnemies: drawEnemies
};

// ===== PASSO 5: Integrar no main.js =====

// Em generateChunk(), adicionar:
if (typeof EntitiesSystem !== 'undefined') {
    chunk.enemies = EntitiesSystem.generateEnemies(chunk, basePlatforms);
}

// Em update(), adicionar:
let allEnemies = [];
for (let chunk of chunks) {
    allEnemies.push(...chunk.enemies);
}
EntitiesSystem.updateEnemies(allEnemies, player, allPlatforms, GAME);

// Em draw(), adicionar:
EntitiesSystem.drawEnemies(ctx, allEnemies, GAME.cameraY);
```

---

## 🎨 PALETA DE CORES PADRÃO

Use estas cores para manter consistência visual:

```javascript
const PALETTE = {
    // Principais
    cyan: '#0ff',
    green: '#0f0',
    purple: '#a0f',
    orange: '#f94',
    yellow: '#ff0',
    red: '#f00',
    
    // Backgrounds
    bgDark: '#050510',
    bgDarker: '#020208',
    bgPanel: 'rgba(10, 10, 20, 0.95)',
    
    // Gemas
    gemNormal: '#0ff',
    gemSpecial: '#ff0',
    gemRare: '#a0f',
    
    // Power-ups
    powerSpeed: '#ff0',
    powerJump: '#0ff',
    powerShield: '#0f0',
    powerMagnet: '#f0f',
    
    // Entidades
    enemy: '#f00',
    boss: '#f94',
    portal: '#a0f',
    
    // UI
    textPrimary: '#eee',
    textSecondary: '#888',
    textSuccess: '#0f0',
    textWarning: '#ff0',
    textDanger: '#f00'
};
```

---

## 🧪 COMANDOS DE DEBUG ÚTEIS

Cole estes no console (F12) enquanto joga:

```javascript
// ===== GOD MODE =====
GAME.health = 999;
GAME.activePowerUps.shield = { active: true, endTime: Date.now() + 9999999 };

// ===== TELEPORT =====
player.y = 10000;  // Ir para 1000m de profundidade
GAME.cameraY = player.y - 200;

// ===== SPAWN GEMAS =====
for (let i = 0; i < 20; i++) {
    allGems.push({
        x: player.x + Math.random() * 100 - 50,
        y: player.y - 200 - (i * 30),
        collected: false,
        type: 'rare',
        value: 100,
        color: '#a0f',
        size: 16,
        pulse: 0
    });
}

// ===== VER ESTADO DO JOGO =====
console.table({
    Profundidade: `${GAME.depth}px (${Math.floor(GAME.depth/10)}m)`,
    Score: GAME.score,
    Vida: GAME.health,
    Modo: player.modeIndex === 0 ? 'CAMINHADA' : 'ASTERISCO',
    Chunks: chunks.length,
    Gemas: allGems.filter(g => !g.collected).length,
    PowerUps: allPowerUps.filter(p => !p.collected).length,
    FPS: Math.round(1000 / (performance.now() - GAME.lastFrameTime))
});

// ===== LIMPAR CONSOLE =====
console.clear();

// ===== PAUSAR/DESPAUSAR =====
GAME.paused = !GAME.paused;

// ===== RESETAR SEM F5 =====
resetGame();

// ===== TESTAR POWER-UP ESPECÍFICO =====
GAME.activePowerUps.speed = { active: true, endTime: Date.now() + 10000 };
GAME.activePowerUps.jump = { active: true, endTime: Date.now() + 10000 };
GAME.activePowerUps.shield = { active: true, endTime: Date.now() + 10000 };
GAME.activePowerUps.magnet = { active: true, endTime: Date.now() + 10000 };

// ===== MUDAR DIFICULDADE SEM RELOAD =====
GameConfig.apply('HARD');
resetGame();

// ===== FPS COUNTER =====
setInterval(() => {
    console.log(`FPS: ${Math.round(60 / ((performance.now() - GAME.lastFrameTime) / 16))}`);
    GAME.lastFrameTime = performance.now();
}, 1000);

// ===== DESATIVAR GRAVIDADE (MODO VOO) =====
CONFIG.gravity = 0;
player.velY = 0;

// ===== SPEED HACK =====
player.speed = 20;  // Super rápido!

// ===== ATRAVESSAR PAREDES =====
window.oldCheckCollision = checkPlayerCollision;
checkPlayerCollision = () => {};  // Desabilita colisão
// Reverter: checkPlayerCollision = window.oldCheckCollision;
```

---

## 📊 MÉTRICAS PARA MONITORAR

Durante o desenvolvimento, monitore estas métricas:

```javascript
// Adicionar no gameLoop():
const METRICS = {
    fps: 0,
    frameTime: 0,
    updateTime: 0,
    drawTime: 0,
    chunksActive: 0,
    entitiesTotal: 0,
    collisionChecks: 0,
    
    frames: 0,
    lastLog: performance.now(),
    
    measure(fn, name) {
        const start = performance.now();
        fn();
        this[name + 'Time'] = performance.now() - start;
    },
    
    log() {
        const now = performance.now();
        if (now - this.lastLog > 1000) {
            console.log(`
📊 MÉTRICAS:
   FPS: ${this.fps}
   Frame: ${this.frameTime.toFixed(2)}ms
   Update: ${this.updateTime.toFixed(2)}ms
   Draw: ${this.drawTime.toFixed(2)}ms
   Chunks: ${this.chunksActive}
   Entidades: ${this.entitiesTotal}
   Colisões: ${this.collisionChecks}
            `);
            
            this.frames = 0;
            this.lastLog = now;
        }
        this.frames++;
        this.fps = this.frames;
    }
};

// No gameLoop():
function gameLoop() {
    const frameStart = performance.now();
    
    METRICS.measure(() => update(), 'update');
    METRICS.measure(() => draw(), 'draw');
    
    METRICS.frameTime = performance.now() - frameStart;
    METRICS.chunksActive = chunks.length;
    METRICS.entitiesTotal = allGems.length + allPowerUps.length + allObstacles.length;
    METRICS.log();
    
    requestAnimationFrame(gameLoop);
}
```

**Alvos de Performance:**
- FPS: 60 constante
- Frame Time: <16ms (ideal <10ms)
- Update Time: <5ms
- Draw Time: <8ms
- Chunks ativos: 4-8
- Entidades totais: <150

---

## 🔍 TROUBLESHOOTING RÁPIDO

### **Problema: Nada funciona após modificação**

```bash
# 1. Verificar erros no console
# F12 → Console → Procurar linhas vermelhas

# 2. Verificar se todos módulos carregaram
# Console deve mostrar 8x "✅ ... carregado!"

# 3. Reverter para backup
cp -r tars-entombed-backup-YYYYMMDD/* tars-entombed/

# 4. Refazer modificação com mais cuidado
```

### **Problema: Performance caindo**

```javascript
// 1. Medir onde está lento
PROFILER.start('suspeito');
funcaoSuspeita();
PROFILER.end('suspeito');

// 2. Adicionar culling se necessário
if (entity.y < cameraY - 200 || entity.y > cameraY + 700) {
    continue;  // Pular este
}

// 3. Reduzir entidades
CONFIG.maxGems = 50;  // Limitar total
```

### **Problema: Bug só acontece às vezes**

```javascript
// Seed determinística para reproduzir:
Math.random = (function() {
    let seed = 12345;  // Fixar seed
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
})();

// Agora o bug acontece sempre da mesma forma!
```

---

## 📝 CONVENÇÕES DE COMMIT

Use estas mensagens ao salvar versões:

```
✨ feat: Adicionar sistema de sons
🐛 fix: Corrigir bug de colisão com teto
🎨 style: Refatorar código de desenho de gemas
⚡ perf: Otimizar geração de chunks com spatial hashing
📝 docs: Atualizar README com instruções de build
🔧 chore: Atualizar dependências
♻️ refactor: Reorganizar entities-system.js
✅ test: Adicionar testes de colisão
🚀 deploy: Versão 5.0 - Inimigos móveis
🔥 remove: Remover código legado de salas fixas
```

---

## 🎓 DICAS FINAIS

1. **Teste SEMPRE antes de commitar**
   - Jogue 2 minutos
   - Troque de modo várias vezes
   - Verifique console por erros

2. **Documente mudanças grandes**
   - Adicione comentários
   - Atualize este guia se necessário

3. **Use incrementação**
   - Não mude 10 arquivos de uma vez
   - Faça 1 feature, teste, commit

4. **Mantenha backups**
   - Antes de cada sessão
   - Depois de cada feature grande

5. **Peça ajuda quando travar**
   - Explique o que está tentando fazer
   - Mostre o código
   - Descreva o comportamento esperado vs real

---

**BOA SORTE NO DESENVOLVIMENTO! 🚀**

**Lembre-se:** Este projeto já está 70% completo e funcionando. As próximas features são adições, não correções. Divirta-se codando! 😎
