# 🎮 TARS ENTOMBED — DOCUMENTAÇÃO TÉCNICA
## Manual do Desenvolvedor — Versão 6.1

> **Última atualização:** Fevereiro 2026  
> **Versão do jogo:** 6.1  
> **Status:** Estável e jogável

---

# ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Diretórios](#2-estrutura-de-diretórios)
3. [Diagrama de Dependências](#3-diagrama-de-dependências)
4. [Detalhamento de Cada Arquivo](#4-detalhamento-de-cada-arquivo)
5. [Fluxo de Execução](#5-fluxo-de-execução)
6. [Sistemas Implementados](#6-sistemas-implementados)
7. [Como Continuar o Desenvolvimento](#7-como-continuar-o-desenvolvimento)
8. [Referência Rápida — Variáveis e Constantes](#8-referência-rápida)
9. [Troubleshooting](#9-troubleshooting)
10. [Comandos de Debug](#10-comandos-de-debug)
11. [Changelog](#11-changelog)
12. [Glossário](#12-glossário)

---

# 1. VISÃO GERAL

**Nome:** TARS Entombed — Descida Infinita  
**Gênero:** Roguelike Platformer 2D com Mecânica Dual-Reality  
**Plataforma:** Web (JavaScript Vanilla + HTML5 Canvas)  
**Engine:** Sem frameworks — 100% código próprio

## 1.1 Conceito Central

O jogador controla o TARS, um robô modular inspirado no filme Interstellar, que desce infinitamente por um labirinto procedural. A mecânica central é a **Dual-Reality**: cada chunk do mundo contém dois labirintos gerados independentemente — o jogador alterna entre eles pressionando Espaço.

**Motores de dificuldade:**
- Bateria do TARS drena passivamente e mais rápido com profundidade
- Inimigos aumentam em quantidade e velocidade por chunk
- Bosses interrompem a descida em profundidades fixas

## 1.2 Tecnologias

- JavaScript ES6+ (sem frameworks)
- HTML5 Canvas API
- Web Audio API (síntese procedural — sem arquivos de som)
- LocalStorage (persistência de recorde)
- Navegadores suportados: Chrome 51+, Firefox 54+, Safari 10+

---

# 2. ESTRUTURA DE DIRETÓRIOS

```
tars-entombed/
│
├── 📄 tars-entombed-refactored.html     # HTML principal (USAR ESTE)
│
├── 📁 css/
│   └── 📄 tars_game.css                 # Estilos — UI cyberpunk
│
├── 📁 js/
│   │
│   ├── 📄 biomes-data.js                # Dados de biomas + utilitário getCurrentBiomeByDepth()
│   ├── 📄 entombed-core.js              # Algoritmo Entombed (Atari 2600) puro
│   ├── 📄 character.js                  # TARS: física, colisão, transformação, render
│   ├── 📄 game-config.js                # Perfis de dificuldade (EASY/NORMAL/HARD/CREATIVE)
│   ├── 📄 audio-synth.js                # Sintetizador procedural retro (Web Audio API)
│   ├── 📄 ui-controller.js              # Gerenciador de UI — barra de bateria, notificações
│   ├── 📄 entities-system.js            # Hub integrador — expõe window.EntitiesSystem
│   │
│   ├── 📁 boss-system/                  # ⭐ Sistema de bosses (4 módulos)
│   │   ├── 📄 boss-sentinel.js          #   Boss tutorial: drawSentinel()
│   │   ├── 📄 boss-procedural.js        #   Motor procedural: SeededRandom, SPECIES_CATALOG,
│   │   │                                #   BODY_PLANS, ProceduralBoss, generateBodyData()
│   │   ├── 📄 boss-renderer.js          #   Renderizador anatômico: drawEye() (10 formatos),
│   │   │                                #   10 funções draw por arquétipo, drawBossAnatomy()
│   │   └── 📄 boss-core.js              #   Orquestrador: window.BossSystem
│   │
│   └── 📁 entities/
│       ├── 📄 utils.js                  # validateColor() — utilitário de cor hex
│       ├── 📄 particles.js              # Sistema de partículas — createExplosion()
│       ├── 📄 gems.js                   # Gemas (3 tipos) — restauram bateria
│       ├── 📄 powerups.js               # Power-ups (4 tipos)
│       ├── 📄 obstacles.js              # Espinhos
│       ├── 📄 enemies.js                # Inimigos: drone, flamebot, nanite, sawbot
│       └── 📄 decorations.js            # Decorações + sistema de fluxo de água
│
├── 📁 docs/
│   └── 📄 MANUAL_DESENVOLVEDOR_COMPLETO.md   # Este arquivo
│
└── 📁 assets/                           # Reservado para futuro
    ├── sprites/  (vazio)
    ├── sounds/   (vazio)
    └── music/    (vazio)
```

---

# 3. DIAGRAMA DE DEPENDÊNCIAS

```
tars-entombed-refactored.html
│
├── [ORDEM CRÍTICA DE CARREGAMENTO]
│
├─ 1 ─► biomes-data.js
│        └─ globals: BIOMES[], getCurrentBiomeByDepth(meters)
│
├─ 2 ─► entities/utils.js
│        └─ globals: validateColor()
│
├─ 3 ─► entities/particles.js
│        └─ window.EntitiesParticles
│
├─ 4 ─► entities/gems.js
│        └─ window.EntitiesGems
│
├─ 5 ─► entities/powerups.js
│        └─ window.EntitiesPowerUps
│           └─ usa: validateColor(), AudioSynth, UIController
│
├─ 6 ─► entities/obstacles.js
│        └─ window.EntitiesObstacles
│
├─ 7 ─► entities/enemies.js
│        └─ window.EntitiesEnemies
│           └─ 4 tipos: drone, flamebot, nanite, sawbot
│
├─ 8 ─► entities/decorations.js
│        └─ window.EntitiesDecorations
│           └─ usa: getCurrentBiomeByDepth() de biomes-data.js
│
├─ 9 ─► entities-system.js              ⭐ HUB CENTRAL
│        └─ window.EntitiesSystem
│           └─ agrega todos os módulos de entities/
│
├─ 10 ─► boss-system/boss-sentinel.js
│          └─ globals: drawSentinel(ctx, boss, screenY, now)
│
├─ 11 ─► boss-system/boss-procedural.js
│          └─ globals: SeededRandom, SPECIES_CATALOG, BODY_PLANS,
│                      ProceduralBoss, generateBodyData(),
│                      generateColorPalette(), generateBehavior(),
│                      generateProceduralStructure()
│
├─ 12 ─► boss-system/boss-renderer.js
│          └─ globals: drawEye(), drawBossAnatomy(),
│                      drawColossus(), drawSerpentoid(), drawArachnid(),
│                      drawMedusoid(), drawDistributed(), drawEldritch(),
│                      drawHiveOrganism(), drawVortical(), drawMycelial(),
│                      drawRecursive()
│
├─ 13 ─► boss-system/boss-core.js       ⭐ ORQUESTRADOR
│          └─ window.BossSystem, BOSS_MAP
│             ├─ shouldTrigger(), generateArena(), checkAndSpawn()
│             ├─ init(), update(), draw()
│             ├─ _hitBoss(), _handleDefeat()
│             ├─ _drawHPBar(), _drawNameBanner()
│             └─ reset()
│             └─ usa: ProceduralBoss (boss-procedural.js)
│                      drawSentinel (boss-sentinel.js)
│                      drawBossAnatomy (boss-renderer.js)
│
├─ 14 ─► audio-synth.js
│          └─ window.AudioSynth
│
├─ 15 ─► entombed-core.js
│          └─ window.EntombedEngine
│             ├─ getLookupAction(bits, rng, density)
│             └─ createSeededRandom(seed)
│
├─ 16 ─► character.js
│          └─ globals: player, updatePlayerPhysics(), drawTARS()
│             └─ usa: GameConfig, AudioSynth, EntitiesSystem
│
├─ 17 ─► game-config.js
│          └─ window.GameConfig
│             └─ ACTIVE: { physics, modes, gameplay }
│
├─ 18 ─► ui-controller.js
│          └─ window.UIController
│             ├─ updateHealth() → barra de bateria ⚡
│             └─ showNotification()
│
└─ 19 ─► main.js                        ⭐ LOOP PRINCIPAL
           └─ GAME, chunks, gameLoop()
```

**⚠️ REGRA ABSOLUTA:** Nunca alterar a ordem dos scripts no HTML.  
`entities-system.js` deve vir DEPOIS de todos os arquivos de `entities/`.  
Dentro de `boss-system/`, a ordem é: `boss-sentinel.js` → `boss-procedural.js` → `boss-renderer.js` → `boss-core.js`.  
Todo o bloco `boss-system/` deve vir ANTES de `audio-synth.js` e `main.js`.

---

# 4. DETALHAMENTO DE CADA ARQUIVO

## 4.1 biomes-data.js

**Responsabilidade:** Dados estáticos de biomas + utilitário de consulta.

```javascript
// 5 biomas, chunks 1–50
const BIOMES = [
    { name: 'RUÍNAS TECNOLÓGICAS', start: 1,  end: 10, color: '#0f9', ... },
    { name: 'FLORESTA CRISTALINA',  start: 11, end: 20, decor: ['crystal','waterfall'], ... },
    { name: 'LABIRINTO VIBRACIONAL',start: 21, end: 30, ... },
    { name: 'ABISMO GRAVITACIONAL', start: 31, end: 40, decor: ['waterfall','void'], ... },
    { name: 'NÚCLEO CÓSMICO',       start: 41, end: 50, ... }
];

// Utilitário global — usado por main.js, decorations.js, gems.js
function getCurrentBiomeByDepth(meters) { ... }
```

**O que foi removido:** `ENEMY_TYPES` — era legado sem uso. A lógica de inimigos vive em `enemies.js`.

**Para adicionar um bioma:** adicione uma entrada no array `BIOMES` e inclua tipos de `decor` válidos (`waterfall`, `crystal`, `vine`, `circuit`, `portal`, `star`, `void`).

---

## 4.2 entities/enemies.js

**Responsabilidade:** Geração, atualização e desenho dos 4 tipos de inimigos.

### Tipos implementados

| Tipo | Comportamento | Dano | Visual |
|------|--------------|------|--------|
| `drone` | Patrulha + hélices giratórias | 20 | Quadrado colorido com 4 hélices |
| `flamebot` | Patrulha + chama ao se aproximar | 20 | Robô com fogo direcional |
| `nanite` | Wander suave, persegue só a 130px | 20 | Partículas verdes em órbita |
| `sawbot` | Patrulha rápida | 20 | Estrela de 5 lâminas (path único) |

### Constantes ajustáveis

```javascript
const SPAWN_MIN_DIST_SQ = 70 * 70; // distância mínima entre inimigos ao spawnar

// No nanite:
const CHASE_RANGE_SQ = 130 * 130;  // raio de perseguição
```

### Anti-sobreposição

Antes de adicionar um inimigo, o sistema verifica se nenhum inimigo existente está a menos de 70px. Se sobrepõe, descarta silenciosamente.

### Regra de ouro

```javascript
// ✅ SEMPRE usar o rng injetado
generateEnemiesForChunk(chunk, platforms, rng)

// ❌ NUNCA usar Math.random() dentro de generate
```

---

## 4.3 entities/decorations.js

**Responsabilidade:** Decorações visuais por bioma + **sistema de fluxo de água**.

### Sistema de fluxo de água (novo em v6.0)

Ativo nos biomas que contêm `'waterfall'` no array `decor` (Floresta Cristalina, Abismo Gravitacional).

**Funcionamento:**
1. `traceWaterPath()` — traça o caminho real da água seguindo plataformas do chunk, gerando segmentos `fall` (vertical) e `flow` (horizontal)
2. O caminho é salvo no momento da **geração do chunk** (zero custo em runtime)
3. `drawFallSegment()` / `drawFlowSegment()` — animam partículas ao longo dos segmentos usando offset de fase
4. `drawSplash()` — semicírculo de respingo no ponto de impacto

```javascript
// Tipos de segmento gerados por traceWaterPath()
{ type: 'fall', x, startY, endY, len }   // queda vertical
{ type: 'flow', startX, endX, y, dir }   // deslize horizontal
```

**Para desativar a água em um bioma:** remova `'waterfall'` do array `decor` no `biomes-data.js`.

---

## 4.4 boss-system/ ⭐ (4 módulos)

O sistema de bosses foi refatorado de um único arquivo monolítico (`boss-system.js`, ~2083 linhas) para uma pasta com 4 módulos com responsabilidades claras. O comportamento externo é **idêntico** — o `main.js` continua usando apenas `window.BossSystem`.

---

### 4.4.1 boss-sentinel.js

**Responsabilidade:** Render exclusivo do Sentinel MK-I (boss do andar 8, boss tutorial).

```javascript
function drawSentinel(ctx, boss, screenY, now)
```

Desenha o robô metálico com gradiente, olho pulsante, antenas giratórias e pernas. Toda a translação de câmera é feita internamente — não requer `ctx.translate` externo.

---

### 4.4.2 boss-procedural.js

**Responsabilidade:** Todo o motor de geração procedural de bosses.

**Globals exportados:**

| Símbolo | Tipo | Descrição |
|---------|------|-----------|
| `SeededRandom` | class | PRNG determinístico (seed → sequência reproduzível) |
| `SPECIES_CATALOG` | const | 10 espécies com paletas, comportamentos e estruturas permitidas |
| `SPECIES_KEYS` | const | Array com as chaves do catálogo |
| `BODY_PLANS` | const | 10 planos anatômicos (arquétipos) por espécie |
| `ProceduralBoss` | class | Boss gerado via seed — core do sistema infinito |
| `generateBodyData()` | function | Gera dados anatômicos determinísticos por arquétipo |
| `generateColorPalette()` | function | Gera paleta hex (nunca HSL — evita crash no Canvas) |
| `generateBehavior()` | function | Gera comportamento animado (pulse, wave, chaos...) |
| `generateProceduralStructure()` | function | Gera nuvem de pontos por tipo estrutural |
| `hslToHex()` | function | Converte HSL → hex (fix do crash do Canvas no andar 18) |

**As 10 espécies disponíveis:**

| Chave | Nome | Ameaça | Arquétipo |
|-------|------|--------|-----------|
| `GOLIAS` | Golias Magma | EXTREMO | `colossus` |
| `SERPENTE` | Serpente Abissal | ALTO | `serpentine` |
| `ARANHA` | Aranha Cristalina | ALTO | `arachnid` |
| `MEDUSA` | Medusa Plasmática | ALTO | `medusoid` |
| `ENXAME` | Enxame Nanomecânico | CRÍTICO | `distributed` |
| `PESADELO` | Anomalia Pesadelo | CRÍTICO | `eldritch` |
| `COLMEIA` | Colmeia Viva | MÉDIO | `hive_organism` |
| `VORTEX` | Vórtice Gravitacional | EXTREMO | `vortical` |
| `FUNGOS` | Rede Micélica | MÉDIO | `mycelial` |
| `FRACTAL` | Ser Fractal | LENDÁRIO | `recursive` |

**Classe `ProceduralBoss`:**

```javascript
const boss = new ProceduralBoss(seed, forcedSpeciesKey?);
// boss.name        → "Serpente Abissal-A42B"
// boss.palette     → { p, s, h, bg } (cores hex)
// boss.behavior    → { type, speed, amplitude, frequency }
// boss.bodyData    → dados anatômicos do arquétipo (via generateBodyData)
// boss.getDNA()    → "SER-SER-WAV"  (espécie-estrutura-comportamento)
// boss.mutate()    → novo ProceduralBoss com variação genética
```

---

### 4.4.3 boss-renderer.js

**Responsabilidade:** Renderização anatômica completa de todos os arquétipos.

**`drawEye(ctx, x, y, r, eyeShape, palette, time, phase)`**

10 formatos de olho disponíveis:

| eyeShape | Visual |
|----------|--------|
| `slit_v` | Pupila vertical de réptil |
| `small_round` | Olho redondo com gradiente radial |
| `god_eye` | Olho divino com halo e glow |
| `sensor` | Scanner mecânico com linha de varredura |
| `void_iris` | Iris dimensional (3 anéis deslocados) |
| `compound` | Olho composto de 7 hexágonos |
| `singularity` | Buraco negro com 8 camadas concêntricas |
| `spore` | Olho fúngico com gradiente orgânico |
| `infinite` | Espiral fractálica rotacionante |
| `default` | Fallback seguro |

**`drawBossAnatomy(ctx, boss, cx, cy, S, time)`**

Roteador principal. Chama o renderizador correto com base em `boss.bodyData.plan.archetype`:

```javascript
switch(plan.archetype) {
    case 'colossus':      drawColossus(...)      // torso trapezoidal, braços, rachaduras
    case 'serpentine':    drawSerpentoid(...)    // segmentos wave, capuz, presas
    case 'arachnid':      drawArachnid(...)      // 8 pernas articuladas, cefalotórax
    case 'medusoid':      drawMedusoid(...)      // cúpula bezier, tentáculos, biolum.
    case 'distributed':   drawDistributed(...)   // núcleos interconectados com pulso
    case 'eldritch':      drawEldritch(...)      // fragmentos flutuantes, rasuras dimensionais
    case 'hive_organism': drawHiveOrganism(...)  // hexágonos, asas, ferrão
    case 'vortical':      drawVortical(...)      // anéis elípticos contra-rotativos
    case 'mycelial':      drawMycelial(...)      // cogumelo, raízes, esporos caindo
    case 'recursive':     drawRecursive(...)     // polígonos fractais auto-similares
    default:              drawEldritch(...)      // fallback seguro
}
```

---

### 4.4.4 boss-core.js

**Responsabilidade:** Orquestrador — expõe `window.BossSystem` para o `main.js`.

```javascript
window.BossSystem = {
    // Estado
    active, currentBoss, arenaY, arenaH, arenaOpen, arenaFloorY, arenaChunkId,

    // API pública (usada pelo main.js)
    shouldTrigger(chunkId),      // → true se chunkId deve gerar boss
    generateArena(startY, chunkId), // → chunk object (arena flat)
    update(player, gameState),   // chamado a cada frame
    draw(ctx, cameraY),          // chamado a cada frame
    reset(),                     // chamado no resetGame()

    // Internos
    checkAndSpawn(chunkId, yOffset),
    init(chunkId, yOffset, bossType),
    _hitBoss(player, gameState),
    _handleDefeat(gameState),
    _drawHPBar(ctx, boss, screenY),
    _drawNameBanner(ctx, boss, screenY)
}
```

**Lógica de spawn:**

```
chunkId === 8              → Sentinel MK-I (boss tutorial, fixo)
chunkId > 8 && % 10 === 8  → ProceduralBoss(GAME.seed + chunkId)
                              (andares 18, 28, 38, 48...)
```

**Balanceamento dinâmico dos bosses procedurais:**

```javascript
const depthScale  = 1 + (chunkId / 50);
const dynamicHP   = floor((3 + complexity * 5) * depthScale);
const dynamicSpeed = (1.2 + complexity * 1.5) * (1 + chunkId / 100);
```

### Fluxo de um boss

```
chunkId atingido
    → BossSystem.shouldTrigger(chunkId)  →  true
    → generateChunk() retorna BossSystem.generateArena()
    → arena flat com chão + 2 paredes laterais
    → boss spawna (Sentinel ou Procedural)
    → BossSystem.active = true  →  geração procedural pausa
    → Player pula na cabeça (stomp: velY > 2, pés no terço superior)
    → _hitBoss() → hp--, explosão de partículas, bounce do player
    → hp === 0  →  boss.state = 'DEAD'  →  _handleDefeat()
    → AudioSynth.playSound('powerup') + UIController.showNotification()
    → delay 1200ms (explosão visual em '#ffff00')
    → BossSystem.arenaOpen = true
    → main.js limpa platformsCaminhada/Asterisco do chunk
    → player cai  →  geração retoma
```

### Como adicionar um novo boss fixo

1. Em `boss-core.js`: adicionar `chunkId: 'nomeDoBoss'` em `BOSS_MAP` e um novo `else if` em `init()`
2. Criar `js/boss-system/boss-nomeDoBoss.js` com `function drawNomeDoBoss(ctx, boss, screenY, now)`
3. Adicionar `<script src="js/boss-system/boss-nomeDoBoss.js"></script>` no HTML **antes** de `boss-core.js`

### Como adicionar uma nova espécie procedural

1. Em `boss-procedural.js`: adicionar entrada em `SPECIES_CATALOG` e `BODY_PLANS`
2. Em `boss-renderer.js`: adicionar `function drawNovaEspecie(ctx, boss, S, time)` e novo `case` em `drawBossAnatomy()`

---

## 4.5 main.js

**Responsabilidade:** Loop principal, estado global, geração de chunks, controles.

### Objeto GAME

```javascript
const GAME = {
    seed: 0,               // seed atual
    rng: null,
    cameraY: 0,
    depth: 0,
    score: 0,
    health: 100,           // bateria 0–100 (não mais corações)
    frameCount: 0,
    paused: false,
    lastModeSwitch: 0,
    activePowerUps: {},
    recentlyHit: false,
    lastDepthPoint: 0,
    highScore: 0,
    bestSeed: 0,
    batteryDrain: 0.013,   // drain base por frame  ← AJUSTAR AQUI
    limparUses: 3,         // usos do comando L por vida
    limparCooldown: 0      // frame em que pode usar L novamente
};
```

### Controles implementados

| Tecla | Ação |
|-------|------|
| ←/→ | Mover |
| ↑ | Pular (duplo pulo disponível) |
| Espaço | Trocar modo (Caminhada ↔ Asterisco) |
| R | Reiniciar |
| L | **Limpar** bloco abaixo do TARS |

### Comando L — Limites anti-abuso

- **3 usos por vida** (reseta no `resetGame()`)
- **Cooldown de 5 segundos** (300 frames) entre usos
- **Custa 25% de bateria** — impossível usar com bateria < 25%
- Remove o bloco do `allPlatforms` ativo e do chunk pai (ambos os modos)

### Geração de chunk

```javascript
function generateChunk(startY) {
    // 1. Verifica boss
    if (BossSystem.shouldTrigger(chunkId)) {
        return BossSystem.generateArena(startY, chunkId);
    }
    // 2. Geração procedural normal
    // ...
    // 3. Bordas garantidas: 2 tiles de parede em cada lado
    for (let b = 0; b < 2; b++) {
        finalRow[b] = 1;
        finalRow[mazeWidth - 1 - b] = 1;
    }
}
```

---

## 4.6 ui-controller.js

**Responsabilidade:** Gerenciar todos os elementos DOM da interface.

### Barra de bateria (substituiu corações)

```javascript
updateHealth(health) {
    // Gradiente: verde (>60%) → amarelo (>30%) → vermelho (<30%)
    // Blink automático quando < 15%
    // Exibe: ícone ⚡ + barra + percentual numérico
}
```

---

## 4.7 entities-system.js

**Responsabilidade:** Hub integrador — expõe `window.EntitiesSystem` para o `main.js`.

Não contém lógica própria. Apenas delega para os módulos individuais de `entities/`. Se precisar adicionar um novo módulo de entidade, registre-o aqui.

---

# 5. FLUXO DE EXECUÇÃO

## 5.1 Inicialização

```
HTML carrega → CSS → Scripts (ordem do HTML)
    → UIController.init() (DOMContentLoaded)
    → main.js executa resetGame()
        → GAME zerado
        → BossSystem.reset()
        → 4 chunks iniciais gerados
        → allPlatforms/Gems/etc populados
    → gameLoop() inicia (60 FPS)
```

## 5.2 Game Loop (60 FPS)

```
update()
├── Câmera suave: cameraY += (target - cameraY) * 0.1
├── Profundidade: depth = floor(cameraY / 10)
├── Drain passivo: health -= batteryDrain * (1 + depth * 0.0015)
├── Score por distância: +1 a cada 2 metros
├── updateChunks()
│   └── PAUSA se BossSystem.active
├── Popula allPlatforms, allGems, allPowerUps, allObstacles, allEnemies
├── BossSystem.update(player, GAME)
│   └── Se arenaOpen → limpa plataformas da arena
├── updatePlayerPhysics()
├── Trava lateral: player.x entre 40 e 760
├── EntitiesSystem.updateGems()       → restaura bateria na coleta
├── EntitiesSystem.updatePowerUps()
├── EntitiesSystem.updateActivePowerUps()
├── EntitiesSystem.checkObstacleCollisions()  → -15% bateria
└── EntitiesSystem.updateEnemies()    → -20% bateria por toque

draw()
├── Fundo: cor do bioma atual
├── Grid animado com parallax (cameraY * 0.5 % 40)
├── EntitiesSystem.drawDecorations()  → fluxo de água + bg
├── Plataformas (cor + brilho do bioma)
├── EntitiesSystem.drawParticles()
├── EntitiesSystem.drawObstacles()
├── EntitiesSystem.drawEnemies()
├── EntitiesSystem.drawGems()
├── EntitiesSystem.drawPowerUps()
├── drawTARS()
└── BossSystem.draw()                 → boss + barra HP
```

---

# 6. SISTEMAS IMPLEMENTADOS

## 6.1 Bateria (saúde do TARS)

| Evento | Efeito na bateria |
|--------|-----------------|
| Frame passado | -0.013 × fator de profundidade |
| Toque em inimigo | -20% |
| Espinho | -15% |
| Toque lateral no boss | -20% |
| Gema normal | +8% |
| Gema especial | +20% |
| Gema rara | +40% |
| Boss derrotado | +300% (cap 100%) |
| Comando L | -25% |

**Para ajustar velocidade do drain:** `GAME.batteryDrain` em `main.js` (linha ~26).

## 6.2 Sistema de Biomas

5 biomas, cada um com profundidade definida em "metros" (chunks × 10):

| Bioma | Profundidade | Água | Dificuldade |
|-------|-------------|------|-------------|
| Ruínas Tecnológicas | 10–100m | ❌ | 1 |
| Floresta Cristalina | 110–200m | ✅ | 2 |
| Labirinto Vibracional | 210–300m | ❌ | 3 |
| Abismo Gravitacional | 310–400m | ✅ | 4 |
| Núcleo Cósmico | 410–500m | ❌ | 5 |

## 6.3 Dual-Reality

Cada chunk gera dois labirintos independentes. O mesmo `chunkRNG` é usado para ambos, garantindo determinismo.

- **Caminhada (modo 0):** labirinto denso
- **Asterisco (modo 1):** corredor garantido na linha de passagem

Bordas laterais: **2 tiles de parede** em cada lado são sempre forçados para prevenir escape lateral.

## 6.4 PRNG Determinístico

```javascript
// Fórmula de isolamento por chunk
const chunkSeed = GAME.seed + chunkId;
const chunkRNG  = createPRNG(chunkSeed);

// ⚠️ REGRA: toda função generate* deve usar rng injetado
// NUNCA Math.random() dentro de generate
```

O mesmo seed sempre produz o mesmo mundo. O jogador pode compartilhar seeds.

## 6.5 Sistema de Bosses

Chunks de boss substituem a geração procedural por uma arena flat (chão + 2 paredes laterais).

**Andar 8:** Sentinel MK-I — boss tutorial fixo, sempre igual.  
**Andares 18, 28, 38, 48...:** Boss procedural infinito — gerado pela seed `GAME.seed + chunkId`, garantindo que o mesmo andar na mesma seed produza sempre o mesmo boss.

**Combinatória do sistema procedural:**  
10 espécies × 10 arquétipos anatômicos × 10 tipos de estrutura × 7 paletas × 10 comportamentos × 10 formatos de olho = diversidade praticamente irrepetível.

**Balanceamento por profundidade:**  
HP e velocidade escalam com `chunkId` — quanto mais fundo, mais difícil.

Mecânica de combate: **stomp** — TARS cai sobre o boss (`velY > 2`, pés no terço superior do hitbox).  
Recompensa: bateria restaurada + score bônus (escala com a profundidade nos bosses procedurais).

## 6.6 Inimigos

Geração começa no chunk 2. Quantidade: `1 + floor(chunkId / 10)`, máximo 3.  
Só spawnam em plataformas `entombed` com largura > 100px.  
Dano unificado em escala 0–100 (20 por toque).

## 6.7 Power-ups

| Nome | Efeito | Duração |
|------|--------|---------|
| ⚡ speed | Velocidade 2× | 5s |
| 🚀 jump | Super pulo | 5s |
| 🛡️ shield | Invencível | 5s |
| 🧲 magnet | Atrai gemas (raio 180px) | 10s |

---

# 7. COMO CONTINUAR O DESENVOLVIMENTO

## 7.1 Adicionar novo boss fixo

1. Criar `js/boss-system/boss-nomeDoBoss.js` com a função de render:
```javascript
function drawNomeDoBoss(ctx, boss, screenY, now) {
    // boss.x, boss.w, boss.h, boss.accentColor, boss.direction, boss.state
}
```
2. Em `boss-core.js`: adicionar `chunkId: 'nomeDoBoss'` em `BOSS_MAP`
3. Em `boss-core.js`, na função `init()`: adicionar bloco `else if (bossType === 'nomeDoBoss') { ... }`
4. No `tars-entombed-refactored.html`: adicionar `<script>` do novo arquivo **antes** de `boss-core.js`

## 7.1.1 Adicionar nova espécie procedural

1. Em `boss-procedural.js`: adicionar entrada em `SPECIES_CATALOG` (name, emoji, color, structures, palettes, behaviors, renderStyles, complexityMin) e em `BODY_PLANS` (archetype, eyeCount, eyeShape, etc.)
2. Em `boss-renderer.js`: implementar `function drawNovaEspecie(ctx, boss, S, time)` e adicionar `case 'novoArquetipo': drawNovaEspecie(...); break;` em `drawBossAnatomy()`
3. Se necessário, adicionar novo formato de olho em `drawEye()` com o novo `case`

## 7.2 Adicionar novo tipo de inimigo

1. Abrir `entities/enemies.js`
2. Adicionar novo `else if (enemyType === 'nometipo')` no bloco de geração com o objeto `candidate`
3. Adicionar bloco de update no `updateEnemies()`
4. Adicionar bloco de draw no `drawEnemies()`
5. Ajustar a tabela de probabilidades no topo da função `generateEnemiesForChunk`

## 7.3 Adicionar novo bioma

1. Abrir `biomes-data.js`
2. Adicionar entrada no array `BIOMES` com `start`, `end`, `decor`, `particleColor`, etc.
3. Os biomas além do chunk 50 automaticamente usam o último da lista

## 7.4 Adicionar novo power-up

1. Abrir `entities/powerups.js`
2. Adicionar entrada no array `types` dentro de `generatePowerUpsForChunk()`
3. Implementar o efeito em `character.js` ou `main.js` verificando `gameState.activePowerUps.nometipo.active`

## 7.5 Screenshake (sugestão)

```javascript
// main.js — adicionar ao GAME
shakeIntensity: 0,
shakeDuration: 0,

// draw() — antes de desenhar tudo
if (GAME.shakeDuration > 0) {
    ctx.save();
    ctx.translate(
        (Math.random() - 0.5) * GAME.shakeIntensity,
        (Math.random() - 0.5) * GAME.shakeIntensity
    );
    GAME.shakeDuration--;
}
// ... draw normal ...
if (GAME.shakeDuration <= 0) ctx.restore();

// Uso (ex: ao tomar dano):
GAME.shakeIntensity = 8;
GAME.shakeDuration  = 12;
```

---

# 8. REFERÊNCIA RÁPIDA

## Arrays Globais (main.js)

| Variável | Conteúdo |
|----------|----------|
| `chunks[]` | Chunks ativos (4–10 em memória) |
| `allPlatforms[]` | Plataformas do modo atual (reconstruído a cada frame) |
| `allGems[]` | Todas as gemas dos chunks ativos |
| `allPowerUps[]` | Todos os power-ups dos chunks ativos |
| `allObstacles[]` | Todos os obstáculos dos chunks ativos |
| `allEnemies[]` | Todos os inimigos dos chunks ativos |

## Configuração de Dificuldade

Arquivo: `game-config.js`

```javascript
PROFILES = {
    EASY:     { gravity: 0.4, cooldown: 5  },
    NORMAL:   { gravity: 0.5, cooldown: 10 },  // padrão
    HARD:     { gravity: 0.6, cooldown: 15 },
    CREATIVE: { gravity: 0.3, cooldown: 2  }
}
```

## Dimensões do Canvas

- Canvas: 800 × 500px
- Área jogável: x entre 40 e 760 (bordas de 40px cada lado, 2 tiles)
- Chunk height: 520px (13 linhas × 40px tile)
- Maze width: 20 tiles (800px / 40px)

---

# 9. TROUBLESHOOTING

| Sintoma | Causa Provável | Fix |
|---------|---------------|-----|
| Tela preta + erro no console | Erro de sintaxe em algum JS | Verificar console, corrigir o arquivo indicado |
| TARS preso nas paredes | Raro pelo algoritmo | Usar tecla L (3 usos disponíveis) |
| Boss não aparece | Arquivos de `boss-system/` não carregados ou fora de ordem | Verificar os 4 `<script>` no HTML: sentinel → procedural → renderer → core, todos antes de `main.js` |
| Boss procedural não renderiza (invisível) | `boss-renderer.js` não carregado antes de `boss-core.js` | Corrigir ordem dos scripts no HTML |
| Crash no andar 18 com erro de cor | `boss-procedural.js` versão antiga com `hsl()` direto | Usar versão v6.1 que usa `hslToHex()` |
| Chão da arena não abre | `BossSystem.arenaOpen` não consumido | Verificar se main.js atualizado contém o bloco de checagem |
| Inimigos sobrepostos | SPAWN_MIN_DIST_SQ muito pequeno | Aumentar constante em `enemies.js` |
| Água não aparece | Bioma sem `'waterfall'` no decor | Adicionar em `biomes-data.js` |
| Bateria drena muito rápido | `batteryDrain` muito alto | Ajustar `GAME.batteryDrain` em `main.js` |
| Corações no lugar de barra | `ui-controller.js` desatualizado | Usar versão v6.0 do arquivo |
| `getCurrentBiomeByDepth is not defined` | `biomes-data.js` não carregado primeiro | Verificar ordem dos scripts no HTML |

---

# 10. COMANDOS DE DEBUG

```javascript
// God mode (no console do navegador)
GAME.health = 100;
GAME.batteryDrain = 0;
GAME.activePowerUps = { shield: { active: true, endTime: Date.now() + 9999999 } };

// Teleportar para profundidade específica
player.y = 8000;               // ~800m
GAME.cameraY = player.y - 250;

// Forçar boss imediatamente (andar 8 = Sentinel, andar 18 = Procedural)
GAME.batteryDrain = 0;
player.y = (8 * 520) + 100;    // chunk 8 → Sentinel
GAME.cameraY = player.y - 250;

// Forçar boss procedural (chunk 18)
player.y = (18 * 520) + 100;
GAME.cameraY = player.y - 250;

// Ver DNA do boss atual
if (BossSystem.currentBoss?.pData) console.log(BossSystem.currentBoss.pData.getDNA());

// Usos ilimitados do Limpar
GAME.limparUses = 999;
GAME.limparCooldown = 0;

// Ver seed atual
console.log('Seed:', GAME.seed);

// Spawn gemas
for (let i = 0; i < 10; i++) {
    allGems.push({
        x: player.x + (i * 20), y: player.y - 60,
        collected: false, type: 'rare', value: 100,
        color: '#a0f', size: 16, pulse: 0, batteryRestore: 40
    });
}

// Hitboxes de inimigos
allEnemies.forEach(e => {
    ctx.strokeStyle = '#f00';
    ctx.strokeRect(e.x, e.y - GAME.cameraY, e.w, e.h);
});
```

---

# 11. CHANGELOG

## v6.1 (Fevereiro 2026) — Atual

**Refatoração do sistema de bosses:**
- ✅ `boss-system.js` (monolito ~2083 linhas) dividido em 4 módulos na pasta `js/boss-system/`
- ✅ `boss-sentinel.js` — render isolado do Sentinel MK-I
- ✅ `boss-procedural.js` — motor procedural completo: 10 espécies, geração anatômica, paletas, comportamentos, estruturas
- ✅ `boss-renderer.js` — 10 renderizadores anatômicos + `drawEye()` com 10 formatos de olho
- ✅ `boss-core.js` — orquestrador `window.BossSystem`, API pública inalterada
- ✅ Bosses procedurais infinitos a partir do andar 18 (antes: apenas Sentinel repetido)
- ✅ Balanceamento dinâmico de HP e velocidade por profundidade
- ✅ `getDNA()` na classe `ProceduralBoss` — identifica espécie/estrutura/comportamento
- ✅ `mutate()` na classe `ProceduralBoss` — variação genética entre bosses
- ✅ Fix: `hslToHex()` previne crash do Canvas com strings HSL no andar 18+

## v6.0 (Fevereiro 2026)

**Sistemas novos:**
- ✅ `boss-system.js` — framework extensível, primeiro boss: Sentinel MK-I
- ✅ Sistema de bateria 0–100 (substitui corações)
- ✅ Drain passivo de bateria proporcional à profundidade
- ✅ Gemas restauram bateria (8/20/40% por tipo)
- ✅ Comando L — limpar bloco abaixo (3 usos, cooldown 5s, custo 25% bateria)
- ✅ Fluxo de água dinâmico em `decorations.js` (traçado por plataformas)
- ✅ Splash de impacto nas quedas d'água
- ✅ Barra de bateria com gradiente na UI (substituiu corações emoji)

**Correções e melhorias:**
- ✅ Bordas laterais do labirinto: 2 tiles de parede (era 1, permitia escape)
- ✅ `allEnemies` declarado globalmente e limpo no `resetGame()`
- ✅ `drawEnemies` removido do loop de plataformas (era chamado N vezes por frame)
- ✅ `BossSystem.arenaOpen` — chão da arena some após derrota do boss
- ✅ Anti-sobreposição no spawn de inimigos (`SPAWN_MIN_DIST_SQ`)
- ✅ Dano de inimigos e obstáculos reescalado para 0–100

**Inimigos:**
- ✅ Sawbot redesenhado — estrela de 5 lâminas em path único (mais eficiente)
- ✅ Nanite "manso" — wander suave, persegue só a 130px, dano reduzido
- ✅ `enemies.js` completamente refatorado (era inutilizável por bugs de sintaxe)

## v5.2 (Início 2026)

- ✅ PRNG determinístico (Mulberry32) — seeds reproduzíveis
- ✅ Sistema de decorações por bioma
- ✅ Partículas na coleta de gemas
- ✅ `biomes-data.js` limpo: `ENEMY_TYPES` removido, `getCurrentBiomeByDepth()` centralizado
- ✅ `decorations.js` sem função helper duplicada
- ✅ `entities-system.js` como hub integrador
- ✅ Módulos de entidades em pasta `entities/`

## v4.0

- ✅ Sistema de entidades (gemas, power-ups, obstáculos)
- ✅ Score dinâmico
- ✅ Validação de cores hex (`validateColor()`)

## v3.0

- ✅ UI cyberpunk refatorada
- ✅ Cooldown visual
- ✅ Correção do bug de catapultamento

## v2.0

- ✅ Chunks infinitos
- ✅ Dual-Reality funcional

## v1.0

- ✅ Algoritmo Entombed básico
- ✅ Física de plataforma
- ✅ Transformação do TARS

---

# 12. GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| **Chunk** | Seção vertical do mundo (520px). Contém 2 labirintos |
| **Dual-Reality** | Mecânica de 2 mundos paralelos por chunk |
| **Entombed** | Algoritmo procedural misterioso do Atari 2600 |
| **PRNG** | Pseudo-Random Number Generator — aleatoriedade determinística |
| **Seed** | Número que define um mundo inteiro de forma reproduzível |
| **chunkRNG** | PRNG isolado por chunk — `createPRNG(GAME.seed + chunkId)` |
| **Drain** | Perda passiva de bateria por frame |
| **Stomp** | Mecânica de pular na cabeça do boss para causar dano |
| **Arena** | Chunk especial flat (sem labirinto) gerado para batalha de boss |
| **arenaOpen** | Flag que sinaliza ao main.js para remover o chão da arena |
| **Culling** | Não processar/desenhar entidades fora da área visível |
| **wallChance** | Probabilidade do Entombed gerar parede (0.58 = balanced) |
| **Anti-clipping** | Resolve sobreposição física por MTV (Minimum Translation Vector) |
| **Wander** | Comportamento de deriva aleatória suave (nanite) |
| **Espécie** | Categoria de boss procedural (GOLIAS, SERPENTE, ARANHA...) — define paleta, estrutura e comportamento permitidos |
| **Arquétipo** | Plano anatômico de renderização (colossus, serpentine, arachnid...) — define como o boss é desenhado |
| **DNA do Boss** | String `"ESP-EST-COM"` gerada por `ProceduralBoss.getDNA()` que identifica espécie, estrutura e comportamento |
| **hslToHex** | Função em `boss-procedural.js` que converte HSL para hex — previne crash do Canvas com strings de cor dinâmicas |
| **depthScale** | Multiplicador de dificuldade dos bosses procedurais baseado no `chunkId` |

---

**FIM DA DOCUMENTAÇÃO — v6.1**

📅 Atualizado: Fevereiro 2026 | 🎮 Versão do jogo: 6.1 | ✅ Pronto para continuar o desenvolvimento
