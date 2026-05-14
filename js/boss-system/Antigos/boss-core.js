// ============================================================
// 👾 BOSS SYSTEM — TARS Entombed
// Arquivo: boss-core.js
// Depende de: boss-procedural.js, boss-renderer.js, boss-sentinel.js
// ============================================================

// Apenas o boss do tutorial (Andar 8) é fixo. O resto é infinito.
const BOSS_MAP = {
    8:  'sentinel' 
};

window.BossSystem = {
    active: false,
    currentBoss: null,
    arenaY: 0,
    arenaH: 600,
    arenaOpen: false,
    arenaFloorY: 0,
    arenaChunkId: -1,
	projectiles: [],   // projéteis/hazards do boss

    // ── 1. A FUNÇÃO QUE O MAIN.JS ESTAVA PROCURANDO ────────
    shouldTrigger: function(chunkId) {
        // Dispara no andar 8 e a cada 10 andares (18, 28, 38...)
        return (chunkId === 8) || (chunkId > 8 && chunkId % 10 === 8);
    },

    // ── 2. GERA A SALA DO CHEFÃO (ARENA) ────────
    generateArena: function(startY, chunkId) {
        this.checkAndSpawn(chunkId, startY);
        this.arenaChunkId = chunkId;
        this.arenaFloorY = startY + 520; // Define o limite do chão do boss

        const chunk = {
            id: chunkId,
            y: startY,
            platformsCaminhada: [],
            platformsAsterisco: [],
            gems: [],
            powerUps: [],
            obstacles: [],
            decorations: [],
            enemies: []
        };

        // Constrói a sala: Parede Esquerda, Parede Direita e Chão
        chunk.platformsCaminhada.push({ x: 0, y: startY, w: 40, h: 520, type: 'entombed' });
        chunk.platformsCaminhada.push({ x: 760, y: startY, w: 40, h: 520, type: 'entombed' });
        chunk.platformsCaminhada.push({ x: 0, y: startY + 520 - 40, w: 800, h: 40, type: 'entombed' });

        // Asterisco usa a mesma arena
        chunk.platformsAsterisco = [...chunk.platformsCaminhada];

        return chunk;
    },

    // ── Verifica se deve spawnar um boss no chunk atual ────────
    checkAndSpawn: function(chunkId, yOffset) {
        if (chunkId === 8) {
            this.init(chunkId, yOffset, 'sentinel');
        } else if (chunkId > 8 && chunkId % 10 === 8) {
            // Geração Procedural Infinita! (Andares 18, 28, 38, 48...)
            this.init(chunkId, yOffset, 'procedural');
        }
    },

	init: function(chunkId, yOffset, bossType) {
		this.active = true;
		this.arenaY = yOffset;
		this.arenaOpen = false;

		// Limpa projéteis antigos ao iniciar boss (segurança)
		this.projectiles = [];

		if (bossType === 'sentinel') {
			// Seed determinística também pro Sentinel (combate 100% reprodutível)
			const seed0 = (((typeof GAME !== 'undefined' ? GAME.seed : 123) + chunkId) ^ 0x51D00D51) >>> 0;

			this.currentBoss = {
				type: 'sentinel',
				name: 'SENTINEL MK-I',
				hp: 3, maxHp: 3,
				w: 72, h: 52,
				x: 200, y: yOffset + 400,
				speed: 1.8,

				// direção determinística (sem Math.random)
				direction: (seed0 & 1) ? 1 : -1,

				state: 'PATROL',
				stateTimer: 0,
				chargeTimer: 0,
				chargeCooldown: 120,
				accentColor: '#ff4400',
				reward: 300,
				scoreBonus: 1000,
				rotation: 0,

				attackTimer: 0,
				attackCooldown: 90,
				phase: 1,

				// RNG do combate
				_rng: seed0,
				attackSeq: 0
			};

		} else if (bossType === 'procedural') {
			// 🧬 Boss procedural determinístico por seed + chunkId
			const bossSeed = ((typeof GAME !== 'undefined' ? GAME.seed : 123) + chunkId) >>> 0;
			const pBoss = new ProceduralBoss(bossSeed);

			// Balanceamento Dinâmico
			const depthScale = 1 + (chunkId / 50);
			const dynamicHP = Math.floor((3 + pBoss.complexity * 5) * depthScale);
			const dynamicSpeed = (1.2 + pBoss.complexity * 1.5) * (1 + (chunkId / 100));

			// Seed do combate (separada do seed do corpo/anatomia)
			const combatSeed = (bossSeed ^ 0xA5A5A5A5) >>> 0;

			// Direção determinística (sem Math.random)
			const dir = (combatSeed & 1) ? 1 : -1;

			this.currentBoss = {
				type: 'procedural',
				pData: pBoss,
				name: pBoss.name.toUpperCase(),

				hp: dynamicHP,
				maxHp: dynamicHP,

				w: 90, h: 90,
				x: 200, y: yOffset + 350,

				speed: dynamicSpeed,
				direction: dir,

				state: 'PATROL',
				stateTimer: 0,

				accentColor: pBoss.palette.p,
				reward: 500 + (chunkId * 10),
				scoreBonus: 2000 + (chunkId * 50),

				// RNG do combate (100% determinístico)
				_rng: combatSeed,
				attackSeq: 0,

				// memória simples pra IA de ataque (evitar repetir sempre)
				lastAttack: null,
				lastAttack2: null
			};
		}

		console.log(`⚠️ BOSS ATIVADO: ${this.currentBoss.name} no andar ${chunkId}!`);
	},

    // ── Update por frame ──────────────────────────────────────
    update(player, gameState) {
        if (!this.active || !this.currentBoss) return;

        const boss = this.currentBoss;
        const now  = Date.now();

        // ── Animação interna ───────────────────────────────────
        boss.rotation += 0.02;
        boss.chargeTimer++;

        // ── Máquina de estados do boss ─────────────────────────
        if (boss.state === 'HIT') {
            boss.hitTimer--;
            if (boss.hitTimer <= 0) {
                boss.state = boss.hp <= 0 ? 'DEAD' : 'PATROL';
            }
        }

        if (boss.state === 'DEAD') {
            this._handleDefeat(gameState);
            return;
        }
		
		// ── Fase por HP% (muda padrão e agressividade) ──────────────
		const hpPct = boss.hp / boss.maxHp;
		let newPhase = 1;
		if (hpPct <= 0.66) newPhase = 2;
		if (hpPct <= 0.33) newPhase = 3;
		boss.phase = newPhase;

		// Timer geral de ataque
		boss.attackTimer++;

		// Atualiza projéteis/hazards do boss
		this._updateProjectiles(player, gameState);

        if (boss.state === 'PATROL') {
            // Patrulha entre as paredes
            boss.x += boss.speed * boss.direction;
            if (boss.x <= 50)              { boss.x = 50;              boss.direction =  1; }
            if (boss.x + boss.w >= 750)    { boss.x = 750 - boss.w;   boss.direction = -1; }

            // Tenta carregar quando cooldown acabou
            if (boss.chargeTimer >= boss.chargeCooldown) {
                boss.state       = 'CHARGE';
                boss.chargeTimer = 0;
                boss.chargeDir   = player.x > boss.x ? 1 : -1;
            }
        }

        if (boss.state === 'CHARGE') {
            boss.x += boss.speed * 3.5 * boss.chargeDir;
            if (boss.x <= 50 || boss.x + boss.w >= 750) {
                boss.state    = 'PATROL';
                boss.direction = -boss.chargeDir;
            }
        }

		// ── Disparo de ataques (varia por tipo/behavior) ────────────
		if (boss.state !== 'HIT' && boss.state !== 'DEAD') {
			const baseCd = boss.type === 'procedural' ? 80 : 110;
			const phaseCd = boss.phase === 1 ? 1.0 : boss.phase === 2 ? 0.85 : 0.7;
			const cd = Math.floor(baseCd * phaseCd);

			if (boss.attackTimer >= cd) {
				boss.attackTimer = 0;
				this._doAttack(boss, player);
			}
		}
        // ── Manter boss no chão da arena ──────────────────────
        boss.y = this.arenaFloorY - boss.h;

        // ── Colisão boss → player (lateral) ───────────────────
        const overlap = (
            player.x + player.width  > boss.x &&
            player.x                 < boss.x + boss.w &&
            player.y + player.height > boss.y &&
            player.y                 < boss.y + boss.h
        );

        if (overlap) {
            // Verifica stomp: player caindo + pés batendo no topo do boss
            const stomping = (
                player.velY > 2 &&
                player.y + player.height <= boss.y + 18 &&
                boss.state !== 'HIT'
            );

            if (stomping) {
                this._hitBoss(player, gameState);
            } else if (!gameState.recentlyHit && boss.state !== 'HIT') {
                // Toca lateral → dano no player
                gameState.health -= 20;
                gameState.recentlyHit = true;
                if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('hit');
                if (typeof UIController !== 'undefined') UIController.updateHealth(gameState.health);
                setTimeout(() => { gameState.recentlyHit = false; }, 1000);
            }
        }
    },

    _hitBoss(player, gameState) {
        const boss = this.currentBoss;
        boss.hp--;
        boss.state    = 'HIT';
        boss.hitTimer = 40;

        // Bounce do player para cima
        player.velY = -11;

        if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('hit');

        if (typeof EntitiesSystem !== 'undefined') {
            EntitiesSystem.createExplosion(
                boss.x + boss.w / 2,
                boss.y,
                boss.accentColor, 20
            );
        }

        console.log(`👊 Boss hit! HP restante: ${boss.hp}`);

        if (boss.hp <= 0) {
            boss.state = 'DEAD';
        }
    },
	
	// ── RNG determinístico do combate (NÃO usar Math.random) ──────────────
	_rngNext(boss) {
		// LCG 32-bit (determinístico e rápido)
		boss._rng = ((boss._rng >>> 0) * 1664525 + 1013904223) >>> 0;
		return (boss._rng >>> 0) / 4294967296;
	},

	_rngRange(boss, min, max) {
		return min + this._rngNext(boss) * (max - min);
	},

	_rngInt(boss, min, max) {
		return Math.floor(this._rngRange(boss, min, max + 1));
	},

	_rngPickWeighted(boss, items) {
		// items: [{k:'spread', w:2.0}, ...]
		let total = 0;
		for (const it of items) total += Math.max(0, it.w || 0);
		if (total <= 0) return items[0]?.k;

		let r = this._rngRange(boss, 0, total);
		for (const it of items) {
			r -= Math.max(0, it.w || 0);
			if (r <= 0) return it.k;
		}
		return items[items.length - 1]?.k;
	},
	
_doAttack(boss, player) {
    // Ponto de origem do ataque (centro do boss)
    const ox = boss.x + boss.w * 0.5;
    const oy = boss.y + boss.h * 0.35;

    // Vetor até o player
    const px = player.x + player.width * 0.5;
    const py = player.y + player.height * 0.5;
    const tx = px - ox;
    const ty = py - oy;

    const dist = Math.max(0.001, Math.hypot(tx, ty));
    const dx = tx / dist;
    const dy = ty / dist;

    // Sentinel: mantém simples, MAS determinístico e com pequena variação por distância
    if (boss.type === 'sentinel') {
        boss.attackSeq = (boss.attackSeq || 0) + 1;

        const close = dist < 180;
        const far   = dist > 360;

        // alterna por sequência (determinístico), mas reage à distância
        if (close) {
            // perto: spread curto
            this._spawnSpread(ox, oy, dx, dy, 4, 0.45, 6.6, 26, 120);
        } else if (far) {
            // longe: burst mais rápido
            this._spawnBurst(ox, oy, dx, dy, 5, 7.0, 22, 120);
        } else {
            // médio: alterna
            if ((boss.attackSeq % 2) === 0) this._spawnSpread(ox, oy, dx, dy, 3, 0.35, 6.2, 28, 120);
            else this._spawnShot(ox, oy, dx * 7.0, dy * 7.0, 10, 32, 120);
        }
        return;
    }

    // ── Procedural ────────────────────────────────────────────────
    boss.attackSeq = (boss.attackSeq || 0) + 1;

    const b = boss.pData?.behavior;
    const behaviorType = b?.type || 'pulse';

    // speciesKey vem do motor procedural
    const speciesKey =
        boss.pData?.bodyData?.speciesKey ||
        boss.pData?.speciesKey ||
        'UNKNOWN';

    // “Line of sight” simples (arena: sem obstáculos internos):
    // Considera LoS ruim só se player estiver MUITO acima (pulo alto) e muito perto lateralmente
    const verticalGap = (py - oy); // negativo = player acima
    const losBad = (verticalGap < -180) && (Math.abs(tx) < 140);

    // Parâmetros base (amarrados ao DNA + fase)
    const baseSpd = 5.2 + (b?.speed || 1) * 1.2 + boss.phase * 0.6;
    const baseDmg = 22 + boss.phase * 6;

    // “inteligência”: buckets por distância
    const close = dist < 170;
    const mid   = dist >= 170 && dist < 340;
    const far   = dist >= 340;

    // Perfil por espécie (peso de ataques)
    // ataques possíveis: 'burst', 'spread', 'ring', 'orbiters', 'scatter', 'snipe'
    let weights = [];

    // Base do comportamento (behavior.type) — ainda conta, mas não manda sozinho
    const behaviorBias = {
        pulse:   { burst: 2.0, spread: 1.2, snipe: 1.0 },
        breathe: { burst: 1.8, spread: 1.4, scatter: 0.8 },
        wave:    { spread: 2.2, scatter: 1.2, burst: 1.0 },
        flow:    { spread: 2.0, burst: 1.2, ring: 0.8 },
        vibrate: { spread: 1.6, scatter: 1.6, burst: 1.0 },
        spiral:  { ring:  2.5, spread: 1.0, scatter: 0.8 },
        orbit:   { orbiters: 2.6, ring: 1.0, spread: 1.0 },
        jitter:  { scatter: 2.4, spread: 1.2, burst: 1.0 },
        chaos:   { scatter: 2.2, ring: 1.2, spread: 1.0 },
        morph:   { scatter: 2.0, spread: 1.3, burst: 1.0 }
    }[behaviorType] || { burst: 1.4, spread: 1.2, snipe: 1.0 };

    // Função helper local pra montar pesos
    const pushW = (k, w) => weights.push({ k, w });

    // ── Pesos por espécieKey (VARIEDADE POR ESPÉCIE) ───────────────
    switch (speciesKey) {
        case 'GOLIAS':
            pushW('burst',    1.6);
            pushW('spread',   2.0);
            pushW('ring',     1.2);
            pushW('snipe',    1.0);
            pushW('scatter',  0.6);
            pushW('orbiters', 0.4);
            break;

        case 'SERPENTE':
            pushW('spread',   2.2);
            pushW('scatter',  1.8);
            pushW('ring',     1.2);
            pushW('burst',    1.0);
            pushW('orbiters', 0.6);
            pushW('snipe',    0.6);
            break;

        case 'ARANHA':
            pushW('orbiters', 2.2);
            pushW('spread',   1.6);
            pushW('ring',     1.2);
            pushW('scatter',  1.0);
            pushW('burst',    0.8);
            pushW('snipe',    0.6);
            break;

        case 'MEDUSA':
            pushW('orbiters', 1.8);
            pushW('scatter',  1.6);
            pushW('burst',    1.4);
            pushW('ring',     1.0);
            pushW('spread',   1.0);
            pushW('snipe',    0.6);
            break;

        case 'COLMEIA':
            pushW('burst',    2.2);
            pushW('scatter',  1.6);
            pushW('spread',   1.2);
            pushW('orbiters', 1.0);
            pushW('ring',     0.8);
            pushW('snipe',    0.4);
            break;

        case 'VORTEX':
            pushW('ring',     2.4);
            pushW('orbiters', 1.4);
            pushW('spread',   1.2);
            pushW('scatter',  1.0);
            pushW('burst',    0.8);
            pushW('snipe',    0.6);
            break;

        case 'FUNGOS':
            pushW('scatter',  2.2);
            pushW('burst',    1.6);
            pushW('spread',   1.2);
            pushW('ring',     0.8);
            pushW('orbiters', 0.6);
            pushW('snipe',    0.4);
            break;

        case 'FRACTAL':
            pushW('ring',     1.8);
            pushW('burst',    1.6);
            pushW('spread',   1.4);
            pushW('scatter',  1.2);
            pushW('orbiters', 1.0);
            pushW('snipe',    0.8);
            break;

        default:
            // fallback: só pelo behavior
            pushW('burst',    1.2);
            pushW('spread',   1.2);
            pushW('scatter',  1.0);
            pushW('ring',     1.0);
            pushW('orbiters', 0.8);
            pushW('snipe',    0.8);
            break;
    }

    // ── Mistura com bias do behavior.type ─────────────────────────
    // (soma pesos)
    const merged = new Map();
    const add = (k, w) => merged.set(k, (merged.get(k) || 0) + w);

    for (const it of weights) add(it.k, it.w);
    for (const [k, w] of Object.entries(behaviorBias)) add(k, w);

    // ── Inteligência por contexto (distância/posição/LoS) ─────────
    // perto: orbiters + scatter
    if (close) {
        add('orbiters', 1.4);
        add('scatter',  1.2);
        add('spread',   0.6);
        add('ring',     0.2);
        add('snipe',   -0.6);
    }
    // médio: spread + burst
    if (mid) {
        add('spread', 1.2);
        add('burst',  1.0);
        add('scatter',0.4);
        add('ring',   0.4);
        add('snipe',  0.2);
    }
    // longe: ring + snipe + burst
    if (far) {
        add('ring',  1.4);
        add('snipe', 1.2);
        add('burst', 0.8);
        add('orbiters', -0.4);
        add('scatter',  -0.2);
    }
    // LoS ruim: evita snipe (tiro “preciso” desperdiça)
    if (losBad) {
        add('snipe', -2.0);
        add('ring',   0.6);
        add('spread', 0.6);
    }

    // ── Anti-repetição (não spammar sempre o mesmo) ───────────────
    if (boss.lastAttack)  add(boss.lastAttack,  -0.9);
    if (boss.lastAttack2) add(boss.lastAttack2, -0.5);

    // Converte para array de pesos
    const weighted = [];
    for (const [k, w] of merged.entries()) weighted.push({ k, w });

    const chosen = this._rngPickWeighted(boss, weighted);

    // guarda histórico anti-repetição
    boss.lastAttack2 = boss.lastAttack;
    boss.lastAttack = chosen;

    // ── Parâmetros finais (variam por espécie + RNG do boss) ───────
    const spd = baseSpd * this._rngRange(boss, 0.92, 1.08);
    const dmg = Math.floor(baseDmg * this._rngRange(boss, 0.92, 1.10));

    // Escala de “densidade” por fase
    const phaseMult = (boss.phase === 1) ? 1.0 : (boss.phase === 2) ? 1.15 : 1.35;

    // Executa ataque
    if (chosen === 'burst') {
        const n = Math.floor((boss.phase === 1 ? 4 : boss.phase === 2 ? 6 : 7) * (speciesKey === 'COLMEIA' ? 1.25 : 1.0));
        this._spawnBurst(ox, oy, dx, dy, n, spd * 1.05, dmg, 110);

    } else if (chosen === 'spread') {
        const n = Math.floor((boss.phase === 1 ? 5 : boss.phase === 2 ? 7 : 9) * (speciesKey === 'SERPENTE' ? 1.15 : 1.0));
        const spread = (speciesKey === 'GOLIAS') ? 0.45 : (speciesKey === 'SERPENTE') ? 0.60 : 0.55;
        this._spawnSpread(ox, oy, dx, dy, n, spread, spd, dmg, 110);

    } else if (chosen === 'ring') {
        const n = Math.floor((boss.phase === 1 ? 8 : boss.phase === 2 ? 10 : 12) * (speciesKey === 'VORTEX' ? 1.15 : 1.0));
        const spin = (speciesKey === 'VORTEX') ? 0.35 : (speciesKey === 'ARANHA') ? 0.22 : 0.25;
        this._spawnRing(boss, ox, oy, n, spd * 0.95, dmg, 140, spin);

    } else if (chosen === 'orbiters') {
        const n = Math.floor((boss.phase === 1 ? 3 : boss.phase === 2 ? 4 : 5) * (speciesKey === 'ARANHA' ? 1.20 : 1.0));
        const orbitSpeed = (1.6 + boss.phase * 0.3) * (speciesKey === 'ARANHA' ? 1.15 : 1.0);
        this._spawnOrbiters(boss, ox, oy, n, orbitSpeed, dmg, 240);

    } else if (chosen === 'scatter') {
        const n = Math.floor((boss.phase === 1 ? 6 : boss.phase === 2 ? 8 : 10) * (speciesKey === 'FUNGOS' ? 1.10 : 1.0));
        this._spawnScatter(boss, ox, oy, dx, dy, n, spd * phaseMult, dmg, 120);

    } else { // 'snipe' (tiro direto mais “preciso” e rápido)
        const s = spd * (far ? 1.35 : 1.20);
        this._spawnShot(ox, oy, dx * s, dy * s, 10, Math.floor(dmg * 1.05), 120);
    }
},

_spawnShot(x, y, vx, vy, r, damage, ttl) {
    this.projectiles.push({
        type: 'boss_shot',
        x, y, vx, vy,
        r, damage,
        ttl: ttl || 120,
        t: 0
    });
},

_spawnBurst(ox, oy, dx, dy, n, spd, dmg, ttl) {
    for (let i = 0; i < n; i++) {
        const s = spd * (0.9 + i * 0.03);
        this._spawnShot(ox, oy, dx * s, dy * s, 9, dmg, ttl);
    }
},

_spawnSpread(ox, oy, dx, dy, n, spreadRad, spd, dmg, ttl) {
    const baseAng = Math.atan2(dy, dx);
    const half = (n - 1) * 0.5;
    for (let i = 0; i < n; i++) {
        const a = baseAng + (i - half) * spreadRad;
        this._spawnShot(ox, oy, Math.cos(a) * spd, Math.sin(a) * spd, 9, dmg, ttl);
    }
},

_spawnRing(boss, ox, oy, n, spd, dmg, ttl, spin) {
    // Offset determinístico por ataque (independente de FPS/Date.now)
    const seq = (boss.attackSeq || 0);
    const baseOff = (seq * 0.37) + this._rngRange(boss, -0.15, 0.15);

    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + baseOff + (spin || 0) * 0.5;
        this._spawnShot(ox, oy, Math.cos(a) * spd, Math.sin(a) * spd, 8, dmg, ttl);
    }
},

_spawnScatter(boss, ox, oy, dx, dy, n, spd, dmg, ttl) {
    const baseAng = Math.atan2(dy, dx);

    for (let i = 0; i < n; i++) {
        // jitter determinístico
        const jitter = this._rngRange(boss, -0.6, 0.6); // ~ (Math.random()-0.5)*1.2
        const a = baseAng + jitter;

        const s = spd * this._rngRange(boss, 0.7, 1.3);
        this._spawnShot(ox, oy, Math.cos(a) * s, Math.sin(a) * s, 8, dmg, ttl);
    }
},

_spawnOrbiters(boss, ox, oy, n, orbitSpeed, dmg, ttl) {
    // fase inicial determinística (não usa Date.now)
    const seq = (boss.attackSeq || 0);
    const baseA = (seq * 0.55) + this._rngRange(boss, -0.25, 0.25);

    for (let i = 0; i < n; i++) {
        this.projectiles.push({
            type: 'boss_orbiter',
            cx: ox, cy: oy,
            a: (i / n) * Math.PI * 2 + baseA,
            orbitR: 38 + i * 8,
            orbitSpeed,
            r: 10,
            damage: dmg,
            ttl: ttl || 240,
            t: 0
        });
    }
},

_updateProjectiles(player, gameState) {
    if (!this.projectiles.length) return;

    const hasShield = gameState.activePowerUps?.shield?.active;
    const px = player.x + player.width * 0.5;
    const py = player.y + player.height * 0.5;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.t++;
        p.ttl--;

        // Movimento
        if (p.type === 'boss_orbiter') {
            p.a += p.orbitSpeed * 0.02;
            p.x = p.cx + Math.cos(p.a) * p.orbitR;
            p.y = p.cy + Math.sin(p.a) * (p.orbitR * 0.6);
        } else {
            p.x += p.vx;
            p.y += p.vy;
        }

        // Colisão (círculo vs ponto do player)
        const dx = px - p.x;
        const dy = py - p.y;
        if (!hasShield && !gameState.recentlyHit && (dx*dx + dy*dy) < (p.r * p.r)) {
            gameState.health -= p.damage;
            gameState.recentlyHit = true;
            if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('hit');
            if (typeof UIController !== 'undefined') UIController.updateHealth(gameState.health);
            setTimeout(() => { gameState.recentlyHit = false; }, 900);

            // efeito
            if (typeof EntitiesSystem !== 'undefined') {
                EntitiesSystem.createExplosion(p.x, p.y, '#ffcc00', 10);
            }

            // Consome projétil ao acertar
            this.projectiles.splice(i, 1);
            continue;
        }

        // Despawn por tempo ou fora da arena
        const out = (p.x < 20 || p.x > 780 || p.y < this.arenaY - 60 || p.y > this.arenaFloorY + 60);
        if (p.ttl <= 0 || out) this.projectiles.splice(i, 1);
    }
},

_drawProjectiles(ctx, cameraY) {
    if (!this.projectiles.length) return;
    ctx.save();
    for (const p of this.projectiles) {
        const sy = p.y - cameraY;
        if (sy < -80 || sy > 600) continue;

        ctx.globalAlpha = 0.9;
        ctx.fillStyle = (p.type === 'boss_orbiter') ? '#66ffff' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(p.x, sy, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
},

    _handleDefeat(gameState) {
        const boss = this.currentBoss;
        if (!boss || boss._defeatHandled) return;
        boss._defeatHandled = true;

        // Recompensas
        gameState.health = Math.min(100, gameState.health + boss.reward);
        gameState.score  += boss.scoreBonus;

        if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('powerup');
        if (typeof UIController !== 'undefined') {
            UIController.showNotification(`⚡ +${boss.reward}% BATERIA  +${boss.scoreBonus}pts`, 2500);
            UIController.updateHealth(gameState.health);
        }

        if (typeof EntitiesSystem !== 'undefined') {
            EntitiesSystem.createExplosion(
                boss.x + boss.w / 2,
                boss.y + boss.h / 2,
                '#ffff00', 50
            );
        }

        console.log(`🏆 Boss derrotado: ${boss.name}`);

        // Libera geração procedural após delay visual
        setTimeout(() => {
            this.active       = false;
            this.defeated     = true;   // evita retrigger no mesmo chunk
            this.arenaOpen    = true;   // sinaliza main.js para abrir o chão
            this.currentBoss  = null;
        }, 1200);
    },

    // ── Draw ──────────────────────────────────────────────────
    draw(ctx, cameraY) {
        if (!this.active || !this.currentBoss) return;

        const boss    = this.currentBoss;
        const screenY = boss.y - cameraY;
        if (screenY < -100 || screenY > 650) return;

        // Indicador de HP acima do boss (sempre visível)
        this._drawHPBar(ctx, boss, screenY);

        // Banner de nome (primeira vez que aparece)
        this._drawNameBanner(ctx, boss, screenY);
		this._drawProjectiles(ctx, cameraY);

        const now = Date.now();
        const t = now * 0.001;

        if (boss.type === 'sentinel') {
            // ✅ O Sentinel faz a própria translação de câmera internamente
            if (typeof drawSentinel === 'function') drawSentinel(ctx, boss, screenY, now);
        } else if (boss.type === 'procedural') {
            ctx.save();
            // ✅ Apenas o boss procedural precisa desta translação
            ctx.translate(boss.x + boss.w / 2, screenY + boss.h / 2);
            
            const scale = boss.w * 0.8; 
            const animTime = boss.state === 'CHARGE' ? t * 2 : t;
            drawBossAnatomy(ctx, boss.pData, 0, 0, scale, animTime);
            
            ctx.restore();
        }
		
    },

    _drawHPBar(ctx, boss, screenY) {
        const BAR_W = 120;
        const BAR_H = 8;
        const bx    = boss.x + boss.w / 2 - BAR_W / 2;
        const by    = screenY - 22;

        // Fundo
        ctx.fillStyle = '#333';
        ctx.fillRect(bx, by, BAR_W, BAR_H);

        // Preenchimento
        const pct = boss.hp / boss.maxHp;
        ctx.fillStyle = pct > 0.5 ? '#0f0' : pct > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(bx, by, BAR_W * pct, BAR_H);

        // Borda
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, BAR_W, BAR_H);

        // Nome
        ctx.fillStyle   = '#fff';
        ctx.font        = 'bold 10px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText(boss.name, boss.x + boss.w / 2, by - 4);
        ctx.textAlign = 'left';
    },

    _drawNameBanner(ctx, boss, screenY) {
        // Só se ainda tem mais de 2 HP intactos (recém spawned)
        if (boss.hp < boss.maxHp) return;
        const t = Date.now() * 0.002;
        const alpha = (Math.sin(t) + 1) * 0.4 + 0.1;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = '#ff0';
        ctx.font        = 'bold 13px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText('▼ PULE NA CABEÇA ▼', 400, screenY - 40);
        ctx.globalAlpha = 1;
        ctx.textAlign   = 'left';
    },

    // Reseta para permitir bosses em novo jogo
    reset() {
        this.active       = false;
        this.defeated     = false;
        this.arenaOpen    = false;
        this.currentBoss  = null;
        this.arenaChunkId = -1;
		this.projectiles = [];
    }
};

console.log('👾 BossSystem carregado — BOSS_MAP:', Object.keys(BOSS_MAP).join(', '));
