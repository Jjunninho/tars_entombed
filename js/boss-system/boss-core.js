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
			// Seed determinística também pro Sentinel (combate/movimento reprodutível)
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

				// Movimento 2D leve
				vx: 0, vy: 0,
				targetX: 200,
				targetY: yOffset + 360,
				moveMode: 'STRAFE', // sentinel: mais mecânico
				moveTimer: 0,
				moveCooldown: 90,
				hoverT: 0,

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

				// RNG determinístico do boss
				_rng: seed0,
				attackSeq: 0,
				lastAttack: null,
				lastAttack2: null
			};

		} else if (bossType === 'procedural') {
			// 🧬 Boss procedural determinístico por seed + chunkId
			const bossSeed = ((typeof GAME !== 'undefined' ? GAME.seed : 123) + chunkId) >>> 0;
			const pBoss = new ProceduralBoss(bossSeed);

			// Balanceamento Dinâmico
			const depthScale = 1 + (chunkId / 50);
			const dynamicHP = Math.floor((3 + pBoss.complexity * 5) * depthScale);
			const dynamicSpeed = (1.2 + pBoss.complexity * 1.5) * (1 + (chunkId / 100));

			// Seed do combate/movimento (separada do seed do corpo/anatomia)
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

				// Movimento 2D “voador”
				vx: 0, vy: 0,
				targetX: 220,
				targetY: yOffset + 320,
				moveMode: 'HOVER',
				moveTimer: 0,
				moveCooldown: 80,
				hoverT: 0,

				state: 'PATROL',
				stateTimer: 0,

				accentColor: pBoss.palette.p,
				reward: 500 + (chunkId * 10),
				scoreBonus: 2000 + (chunkId * 50),

				// RNG do combate/movimento (100% determinístico)
				_rng: combatSeed,
				attackSeq: 0,

				// memória simples pra IA (evitar repetir sempre)
				lastAttack: null,
				lastAttack2: null
			};
		}

		console.log(`⚠️ BOSS ATIVADO: ${this.currentBoss.name} no andar ${chunkId}!`);
	},

    // ── Update por frame ──────────────────────────────────────
	update: function(player, gameState) {
		if (!this.active || !this.currentBoss) return;

		const boss = this.currentBoss;

		// Arena: piso aproximado (se não existir, calcula na hora)
		if (!this.arenaFloorY) this.arenaFloorY = this.arenaY + 480;

        // 🟢 COLOQUE A RECUPERAÇÃO AQUI, BEM NO INÍCIO DO UPDATE! 🟢
		if (boss.state === 'HIT') {
			boss.hitTimer = (boss.hitTimer || 0) - 1;

			// ainda deixa escorregar um pouco com a inércia
			boss.x += boss.vx || 0;
			boss.y += boss.vy || 0;
			boss.vx *= 0.9;
			boss.vy *= 0.9;

			if (boss.hitTimer <= 0) {
				boss.state = 'PATROL';
				boss.hitTimer = 0;
			}
		}

		// Contadores
		boss.chargeTimer = (boss.chargeTimer || 0) + 1;

		// ── Fase por HP% ─────────────────────────────────────────────
		const hpPct = boss.hp / boss.maxHp;
		let newPhase = 1;
		if (hpPct <= 0.66) newPhase = 2;
		if (hpPct <= 0.33) newPhase = 3;
		boss.phase = newPhase;

		// ── Ataques / projéteis ──────────────────────────────────────
		boss.attackTimer = (boss.attackTimer || 0) + 1;
		this._updateProjectiles(player, gameState);

		// Estado morto
		if (boss.state === 'DEAD') return;

		// ─────────────────────────────────────────────────────────────
		// MOVIMENTO
		// ─────────────────────────────────────────────────────────────

		if (boss.type === 'procedural') {
			// Procedural: movimento 2D sempre em PATROL
			if (boss.state === 'PATROL') {
				this._updateMovement2D(boss, player);
			}
		} else {
			// Sentinel: mantém o estilo “mecânico”
			// Mas adiciona micro reposicionamento (opcional e leve)
			if (boss.state === 'PATROL') {
				// patrulha X clássica
				boss.x += boss.speed * boss.direction;

				// limites (ajuste se sua arena for diferente)
				if (boss.x < 80) boss.direction = 1;
				if (boss.x > 320) boss.direction = -1;

				// micro ajuste Y para não parecer “linha reta”
				// determinístico via RNG do boss
				boss.hoverT = (boss.hoverT || 0) + 1;
				const bob = Math.sin(boss.hoverT * 0.04) * 0.6;
				boss.y = this._clamp(boss.y + bob, this.arenaY + 200, this.arenaFloorY - 170);

				// ainda permite que ele faça CHARGE (dash)
				if (boss.chargeTimer > boss.chargeCooldown) {
					boss.state = 'CHARGE';
					boss.stateTimer = 0;
					boss.chargeTimer = 0;
				}
			}

			if (boss.state === 'CHARGE') {
				boss.stateTimer++;

				// Dash horizontal (seu comportamento clássico)
				boss.x += boss.direction * boss.speed * 4.2;

				// Sai do charge em ~1s
				if (boss.stateTimer > 60) {
					boss.state = 'PATROL';
					boss.stateTimer = 0;
				}

				// bate na parede e inverte
				if (boss.x < 60) boss.direction = 1;
				if (boss.x > 340) boss.direction = -1;
			}
		}

		// ── Disparo de ataques (IA já inteligente) ────────────────────
		// (mantém seu sistema atual; se você já tem essa parte, pode manter)
		if (boss.state !== 'HIT' && boss.state !== 'DEAD') {
			const baseCd = boss.type === 'procedural' ? 80 : 110;
			const phaseCd = boss.phase === 1 ? 1.0 : boss.phase === 2 ? 0.85 : 0.7;
			const cd = Math.floor(baseCd * phaseCd);

			if (boss.attackTimer >= cd) {
				boss.attackTimer = 0;
				this._doAttack(boss, player);
			}
		}

    // ─────────────────────────────────────────────────────────────
    // COLISÃO BIDIRECIONAL: player toca boss → boss toma dano
    // (funciona em qualquer direção, pois o boss agora voa)
    // ─────────────────────────────────────────────────────────────

    const hasShield = gameState.activePowerUps?.shield?.active;
    const overlap =
        player.x < boss.x + boss.w &&
        player.x + player.width > boss.x &&
        player.y < boss.y + boss.h &&
        player.y + player.height > boss.y;

    // Decrementa cooldown de hit no boss (separado do recentlyHit do player)
    if (boss._hitCooldown > 0) boss._hitCooldown--;

    if (overlap && boss.state !== 'DEAD') {
        if (!boss._hitCooldown) {
            // ✅ Player acerta o boss (de qualquer direção)
            // _hitBoss já faz: boss.hp--, player.velY = -11 (bounce), som, explosão
            this._hitBoss(player, gameState);
            boss._hitCooldown = 50; // ~0.8s — evita dano repetido por ficar encostado
        } else if (!hasShield && !gameState.recentlyHit) {
            // Durante o cooldown, se o player ainda está encostado → toma dano de contato
            gameState.health -= 20;
            gameState.recentlyHit = true;
            if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('hit');
            if (typeof UIController !== 'undefined') UIController.updateHealth(gameState.health);
            setTimeout(() => { gameState.recentlyHit = false; }, 900);
        }
    }

    // ── Fallback de segurança: garante que a morte sempre dispara _handleDefeat
    if (boss.hp <= 0 && boss.state !== 'DEAD') {
        this._handleDefeat(gameState);
    }
},
	
	// ---------------------------------------
	// NOVOS HELPERS
	//----------------------------------
		_clamp(v, a, b) {
		return Math.max(a, Math.min(b, v));
	},

	// RNG determinístico (não usar Math.random / Date.now)
	_rngNext(boss) {
		boss._rng = ((boss._rng >>> 0) * 1664525 + 1013904223) >>> 0;
		return (boss._rng >>> 0) / 4294967296;
	},
	_rngRange(boss, min, max) {
		return min + this._rngNext(boss) * (max - min);
	},
	_rngInt(boss, min, max) {
		return Math.floor(this._rngRange(boss, min, max + 1));
	},

	// Escolhe modo de movimento por espécie + distância + fase (determinístico)
	_chooseMoveMode(boss, player) {
		const px = player.x + player.width * 0.5;
		const py = player.y + player.height * 0.5;
		const ox = boss.x + boss.w * 0.5;
		const oy = boss.y + boss.h * 0.5;

		const dist = Math.max(0.001, Math.hypot(px - ox, py - oy));
		const close = dist < 170;
		const far = dist > 360;

		// speciesKey (se existir)
		const speciesKey =
			boss.pData?.bodyData?.speciesKey ||
			boss.pData?.speciesKey ||
			'UNKNOWN';

		// lista de modos possíveis
		// HOVER: pairar e reposicionar
		// STRAFE: “voo lateral” mantendo altura
		// ORBIT: orbitar o player (ótimo pra VORTEX/ARANHA)
		// DIVE: mergulho e retorno (ataque surpresa / reposicionamento)
		const modes = [];

		// Bias por espécie
		if (speciesKey === 'VORTEX') {
			modes.push({ k: 'ORBIT', w: 2.6 });
			modes.push({ k: 'HOVER', w: 1.4 });
			modes.push({ k: 'STRAFE', w: 1.0 });
			modes.push({ k: 'DIVE', w: 0.8 });
		} else if (speciesKey === 'ARANHA') {
			modes.push({ k: 'ORBIT', w: 2.0 });
			modes.push({ k: 'STRAFE', w: 1.6 });
			modes.push({ k: 'HOVER', w: 1.2 });
			modes.push({ k: 'DIVE', w: 0.9 });
		} else if (speciesKey === 'SERPENTE') {
			modes.push({ k: 'STRAFE', w: 2.2 });
			modes.push({ k: 'HOVER', w: 1.4 });
			modes.push({ k: 'DIVE', w: 1.1 });
			modes.push({ k: 'ORBIT', w: 0.8 });
		} else if (speciesKey === 'GOLIAS') {
			modes.push({ k: 'HOVER', w: 2.2 });
			modes.push({ k: 'STRAFE', w: 1.2 });
			modes.push({ k: 'DIVE', w: 0.6 });
			modes.push({ k: 'ORBIT', w: 0.4 });
		} else if (speciesKey === 'COLMEIA') {
			modes.push({ k: 'STRAFE', w: 2.0 });
			modes.push({ k: 'HOVER', w: 1.4 });
			modes.push({ k: 'ORBIT', w: 1.0 });
			modes.push({ k: 'DIVE', w: 0.8 });
		} else {
			modes.push({ k: 'HOVER', w: 1.8 });
			modes.push({ k: 'STRAFE', w: 1.4 });
			modes.push({ k: 'ORBIT', w: 1.0 });
			modes.push({ k: 'DIVE', w: 0.8 });
		}

		// Contexto: perto → DIVE/ORBIT; longe → STRAFE/HOVER
		if (close) {
			for (const m of modes) {
				if (m.k === 'DIVE') m.w += 0.7;
				if (m.k === 'ORBIT') m.w += 0.5;
				if (m.k === 'HOVER') m.w -= 0.2;
			}
		}
		if (far) {
			for (const m of modes) {
				if (m.k === 'STRAFE') m.w += 0.6;
				if (m.k === 'HOVER') m.w += 0.3;
				if (m.k === 'DIVE') m.w -= 0.4;
			}
		}

		// Fase: mais agressivo no fim
		if (boss.phase >= 3) {
			for (const m of modes) {
				if (m.k === 'DIVE') m.w += 0.4;
				if (m.k === 'ORBIT') m.w += 0.2;
			}
		}

		// sorteio determinístico ponderado
		let total = 0;
		for (const m of modes) total += Math.max(0, m.w);
		let r = this._rngRange(boss, 0, total);

		for (const m of modes) {
			r -= Math.max(0, m.w);
			if (r <= 0) return m.k;
		}
		return modes[0].k;
	},
	
	// FIM DOS NOVOS HELPERS

// Define um target (alvo) determinístico “perto” do player, respeitando arena
_setTargetNearPlayer(boss, player, radiusX, radiusY) {
    const px = player.x + player.width * 0.5;
    const py = player.y + player.height * 0.5;

    // offsets determinísticos (sem Math.random)
    const ox = this._rngRange(boss, -radiusX, radiusX);
    const oy = this._rngRange(boss, -radiusY, radiusY);

    // bounds da arena (x ~ 40..760, y dentro da faixa da arena)
    const minX = 60;
    const maxX = 740;

    const minY = this.arenaY + 140;
    const maxY = this.arenaFloorY - 160;

    boss.targetX = this._clamp(px + ox, minX, maxX);
    boss.targetY = this._clamp(py + oy, minY, maxY);
},

// Atualiza locomoção 2D do boss procedural (e sentinel em modo leve)
// Substitua completamente a velha _updateMovement2D por esta:

_updateMovement2D(boss, player) {
    // 1. LER O DNA PROCEDURAL DO BOSS
    // Fallback de segurança pro Sentinel que não tem pData procedural
    if (boss.type === 'sentinel') return; 
    
    const dna = boss.pData.locomotion;
    const px = player.x + player.width * 0.5;
    const py = player.y + player.height * 0.5;
    const cx = boss.x + boss.w * 0.5;
    const cy = boss.y + boss.h * 0.5;

    // Limites da Arena
    const minX = 50, maxX = 750;
    const minY = this.arenaY + 130, maxY = this.arenaFloorY - boss.h;

    // 2. GRAVIDADE DINÂMICA (Baseada em % de Voo)
    // Se voar = 1 (100%), gravidade é 0. Se voar = 0%, gravidade alta.
    const gravity = (1 - dna.voar) * 0.65;
    boss.vy = (boss.vy || 0) + gravity;

    let onGround = boss.y >= maxY - 5;
    let onWall = boss.x <= minX + 5 || boss.x >= maxX - boss.w - 5;

    // 3. TARGETING HÍBRIDO (Morder, Atirar, Picar, Grudar)
    let targetX = px;
    let targetY = py;

    if (dna.picar && boss.attackTimer < 40) {
        // Tática Picar: Logo após atirar/atacar, ele foge para trás ou para cima
        targetX = cx + (cx > px ? 300 : -300);
        targetY = minY + 50;
    } else if (dna.morder) {
        // Tática Morder: Quer encostar em você
        targetX = px;
        targetY = py;
    } else if (dna.atirar) {
        // Tática Atirador: Mantém distância de 200 a 300px
        const dx = px - cx;
        const dist = Math.abs(dx) || 1;
        if (dist < 250) {
            targetX = cx - Math.sign(dx) * 150; // Se afasta
        }
        targetY = py - 150; // Tenta ficar no alto
    }

    if (dna.grudarParede || dna.rastejar) {
        // Anula a perseguição lateral, tenta ir pra parede mais próxima
        if (cx < 400) targetX = minX;
        else targetX = maxX;
    }

    // 4. MÁQUINA DE AÇÕES (Pular, Investir, Esmagar)
    // Sorteia ações bruscas se o cooldown permitir
    boss.actionTimer = (boss.actionTimer || 0) + 1;
    
    // _rngNext é sua função de random determinístico do boss-core
    if (boss.actionTimer > 80) { 
        const randAct = this._rngNext(boss);

        // A. INVESTIDA (Dash)
        if (randAct < dna.investir * 0.1) { // 10% da força do status por frame de ação
            const dist = Math.hypot(px-cx, py-cy) || 1;
            boss.vx = ((px - cx) / dist) * 14; // Dash rápido
            boss.vy = ((py - cy) / dist) * 14;
            boss.actionTimer = 0;
        }
        // B. PULAR (Precisa estar apoiado, ou ter altíssimo % de voo)
        else if (randAct < dna.pulo && (onGround || onWall || dna.voar > 0.8)) {
            boss.actionTimer = 0;
            
            switch(dna.formatoPulo) {
                case 'parabola': // Pulo do Mario
                    boss.vy = -12 - (this._rngNext(boss) * 6);
                    boss.vx = Math.sign(px - cx) * (5 + this._rngNext(boss) * 5);
                    break;
                case 'zigzag': // Pulo bugado
                    boss.vy = -14;
                    boss.vx = (this._rngNext(boss) > 0.5 ? 12 : -12);
                    break;
                case 'quadrado': // Pulo mecânico (Sobe reto)
                    boss.vy = -18;
                    boss.vx = 0; 
                    break;
                case 'teleporte': // Pulo mágico
                    boss.x = this._clamp(targetX + (this._rngNext(boss)-0.5)*150, minX, maxX);
                    boss.y = this._clamp(targetY + (this._rngNext(boss)-0.5)*150, minY, maxY);
                    if (typeof EntitiesSystem !== 'undefined') {
                        EntitiesSystem.createExplosion(cx, cy, boss.accentColor, 12);
                    }
                    break;
            }
        }
        // C. PULAR EM CIMA (Ground Pound)
        else if (dna.pularEmCima && !onGround && Math.abs(px - cx) < 100 && cy < py - 60) {
            boss.vy = 22; // Cai igual bigorna
            boss.vx = 0;
            boss.actionTimer = 0;
        }
    }

    // 5. STEERING (Deslizar em direção ao Alvo)
    // % de Voar dita quão escorregadio ele é no ar, % Aproximar dita agressividade
    const accel = (dna.voar * 0.15) + (dna.aproximar * 0.1);
    const damp = dna.voar > 0.5 ? 0.92 : 0.85;

    let toX = targetX - cx;
    let toY = targetY - cy;
    let d = Math.hypot(toX, toY) || 1;

    let desX = (toX / d) * boss.speed;
    let desY = (toY / d) * boss.speed;

    // Se é Crawler (Rastejador) e está na parede, anula inércia X (só sobe/desce)
    if (dna.rastejar && onWall) desX = 0; 

    // Se é bicho de chão (não sabe voar) não persegue ativamente no eixo Y (Gravidade resolve)
    if (dna.voar < 0.3 && !onGround && !dna.rastejar) desY = 0; 

    boss.vx = boss.vx * damp + desX * accel;
    if (dna.voar > 0.3 || dna.rastejar) {
        boss.vy = boss.vy * damp + desY * accel;
    }

    // Limites Terminais de Velocidade
    boss.vx = this._clamp(boss.vx, -16, 16);
    boss.vy = this._clamp(boss.vy, -22, 22);

    boss.x += boss.vx;
    boss.y += boss.vy;

    // 6. RESOLUÇÃO DE COLISÃO COM O CUBÍCULO (Arena)
    if (boss.x < minX) { boss.x = minX; boss.vx *= -0.5; }
    if (boss.x > maxX - boss.w) { boss.x = maxX - boss.w; boss.vx *= -0.5; }
    
    if (boss.y < minY) { 
        boss.y = minY; 
        boss.vy *= -0.5; 
    }
    
    if (boss.y > maxY) {
        boss.y = maxY;
        // Se bateu forte no chão e é esmagador, solta o som de impacto!
        if (boss.vy > 12 && dna.pularEmCima) {
            if (typeof AudioSynth !== 'undefined') AudioSynth.playSound('land');
            if (typeof EntitiesSystem !== 'undefined') EntitiesSystem.createExplosion(cx, maxY, '#777', 15);
        }
        boss.vy = 0;
    }
},

_hitBoss(player, gameState) {
        const boss = this.currentBoss;
        
        boss.hp--;
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
            this._handleDefeat(gameState);
        } else {
            boss.state = 'HIT'; 
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
        ctx.fillText('⚡ TOQUE O BOSS PARA CAUSAR DANO ⚡', 400, screenY - 40);
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
