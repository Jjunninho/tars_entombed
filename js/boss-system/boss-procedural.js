// ============================================================
// 🧬 MOTOR PROCEDURAL — TARS Entombed
// Arquivo: boss-procedural.js
// ============================================================

    // =================================================================
    // SISTEMA DE SEED (PRNG - Gerador de números pseudo-aleatórios)
    // =================================================================
    
    class SeededRandom {
        constructor(seed) {
            this.seed = seed;
        }
        
        next() {
            this.seed = (this.seed * 9301 + 49297) % 233280;
            return this.seed / 233280;
        }
        
        range(min, max) {
            return min + this.next() * (max - min);
        }
        
        int(min, max) {
            return Math.floor(this.range(min, max + 1));
        }
        
        choice(array) {
            return array[this.int(0, array.length - 1)];
        }
        
        bool(probability = 0.5) {
            return this.next() < probability;
        }
    }

    // =================================================================
    // CATÁLOGO DE ESPÉCIES (do Boss Laboratory)
    // =================================================================
    
    const SPECIES_CATALOG = {
        GOLIAS: {
            name: 'Golias Magma',
            emoji: '🌋',
            color: '#ff4400',
            desc: 'Titã rochoso de movimento lento. Emana calor vulcânico.',
            threat: 'EXTREMO',
            structures: ['radial', 'blob', 'crystalline', 'segmented'],
            palettes: ['fire'],
            behaviors: ['pulse', 'breathe', 'vibrate'],
            renderStyles: ['smooth', 'geometric'],
            complexityMin: 0.6
        },
        SERPENTE: {
            name: 'Serpente Abissal',
            emoji: '🐍',
            color: '#00aaff',
            desc: 'Criatura bioluminescente das profundezas. Movimento sinuoso hipnótico.',
            threat: 'ALTO',
            structures: ['serpentine', 'spiral'],
            palettes: ['neon', 'void', 'electric'],
            behaviors: ['wave', 'flow', 'morph'],
            renderStyles: ['smooth', 'glow'],
            complexityMin: 0.4
        },
        ARANHA: {
            name: 'Aranha Cristalina',
            emoji: '🕷️',
            color: '#aaddff',
            desc: 'Aracnídeo de gelo. Pernas vibram em frequências hipersônicas.',
            threat: 'ALTO',
            structures: ['web', 'radial', 'crystalline'],
            palettes: ['crystal', 'electric'],
            behaviors: ['vibrate', 'jitter', 'orbit'],
            renderStyles: ['geometric', 'pixelated'],
            complexityMin: 0.5
        },
        MEDUSA: {
            name: 'Medusa Plasmática',
            emoji: '🪼',
            color: '#cc44ff',
            desc: 'Organismo energético flutuante. Tentáculos em constante fluxo.',
            threat: 'ALTO',
            structures: ['blob', 'radial', 'clustered'],
            palettes: ['neon', 'void', 'electric'],
            behaviors: ['pulse', 'wave', 'morph', 'flow'],
            renderStyles: ['glow', 'smooth'],
            complexityMin: 0.4
        },
        ENXAME: {
            name: 'Enxame Nanomecânico',
            emoji: '🤖',
            color: '#ffdd00',
            desc: 'Milhares de nano-drones formando consciência coletiva.',
            threat: 'CRÍTICO',
            structures: ['clustered', 'fractal'],
            palettes: ['electric', 'neon'],
            behaviors: ['chaos', 'jitter', 'orbit', 'vibrate'],
            renderStyles: ['pixelated', 'geometric'],
            complexityMin: 0.7
        },
        PESADELO: {
            name: 'Anomalia Pesadelo',
            emoji: '👁️',
            color: '#8800ff',
            desc: 'Entidade dimensional. Viola leis da física euclidiana.',
            threat: 'CRÍTICO',
            structures: ['fractal', 'crystalline'],
            palettes: ['void'],
            behaviors: ['chaos', 'morph', 'spiral'],
            renderStyles: ['glow', 'smooth'],
            complexityMin: 0.75
        },
        COLMEIA: {
            name: 'Colmeia Viva',
            emoji: '🍯',
            color: '#ffaa00',
            desc: 'Estrutura orgânica pulsante. Produz zangões defensores.',
            threat: 'MÉDIO',
            structures: ['web', 'clustered', 'tree', 'segmented'],
            palettes: ['organic', 'toxic'],
            behaviors: ['breathe', 'orbit', 'pulse'],
            renderStyles: ['smooth', 'geometric'],
            complexityMin: 0.3
        },
        VORTEX: {
            name: 'Vórtice Gravitacional',
            emoji: '🌀',
            color: '#00ffee',
            desc: 'Singularidade contida. Distorce espaço-tempo local.',
            threat: 'EXTREMO',
            structures: ['spiral', 'radial'],
            palettes: ['void', 'electric', 'neon'],
            behaviors: ['spiral', 'orbit', 'pulse'],
            renderStyles: ['glow', 'smooth'],
            complexityMin: 0.6
        },
        FUNGOS: {
            name: 'Rede Micélica',
            emoji: '🍄',
            color: '#88ff44',
            desc: 'Super-organismo fúngico. Libera esporos alucinógenos.',
            threat: 'MÉDIO',
            structures: ['tree', 'web', 'clustered', 'blob'],
            palettes: ['organic', 'toxic'],
            behaviors: ['flow', 'wave', 'breathe'],
            renderStyles: ['smooth', 'glow'],
            complexityMin: 0.3
        },
        FRACTAL: {
            name: 'Ser Fractal',
            emoji: '✨',
            color: '#ff88ff',
            desc: 'Padrão matemático auto-replicante. Infinitamente recursivo.',
            threat: 'LENDÁRIO',
            structures: ['fractal', 'spiral', 'crystalline'],
            palettes: ['neon', 'crystal', 'electric'],
            behaviors: ['morph', 'chaos', 'spiral'],
            renderStyles: ['glow', 'pixelated'],
            complexityMin: 0.65
        }
    };
    
    const SPECIES_KEYS = Object.keys(SPECIES_CATALOG);
    let lockedSpecies = null; // null = aleatório

    // =================================================================
    // PLANOS ANATÔMICOS POR ESPÉCIE
    // =================================================================
    
    const BODY_PLANS = {
        GOLIAS:   { archetype: 'colossus',     symmetry: 'bilateral', headH: 0.20, torsoH: 0.42, legH: 0.38, eyeCount:[1,1], eyeShape:'slit_v',    armCount:2, legCount:2 },
        SERPENTE: { archetype: 'serpentine',   symmetry: 'bilateral', headH: 0.18, segments:[8,14],            eyeCount:[2,2], eyeShape:'slit_v',    armCount:0, legCount:0 },
        ARANHA:   { archetype: 'arachnid',     symmetry: 'bilateral', headH: 0.22, cephH:0.32, abdH:0.46,     eyeCount:[4,8], eyeShape:'small_round',armCount:0, legCount:8 },
        MEDUSA:   { archetype: 'medusoid',     symmetry: 'radial',    bellH: 0.50, tentacles:[6,12],           eyeCount:[1,1], eyeShape:'god_eye',   armCount:0, legCount:0 },
        ENXAME:   { archetype: 'distributed',  symmetry: 'loose',     cores:[7,14],                           eyeCount:[3,9], eyeShape:'sensor',    armCount:0, legCount:0 },
        PESADELO: { archetype: 'eldritch',     symmetry: 'broken',                                            eyeCount:[3,9], eyeShape:'void_iris', armCount:0, legCount:0 },
        COLMEIA:  { archetype: 'hive_organism',symmetry: 'bilateral', headH: 0.20, torsoH: 0.45, legH: 0.35, eyeCount:[2,2], eyeShape:'compound',  armCount:2, legCount:4 },
        VORTEX:   { archetype: 'vortical',     symmetry: 'radial',    rings:[3,5],                            eyeCount:[1,1], eyeShape:'singularity',armCount:0, legCount:0 },
        FUNGOS:   { archetype: 'mycelial',     symmetry: 'loose',     capH:0.32, stalkH:0.42, rootH:0.26,    eyeCount:[2,4], eyeShape:'spore',     armCount:0, legCount:0 },
        FRACTAL:  { archetype: 'recursive',    symmetry: 'fractal',   depth:[2,4],                           eyeCount:[1,9], eyeShape:'infinite',  armCount:0, legCount:0 }
    };

    // =================================================================
    // GERADOR DE DADOS CORPORAIS (determinístico via seed)
    // =================================================================
    
    function generateBodyData(rng, speciesKey) {
        const plan = BODY_PLANS[speciesKey] || BODY_PLANS.PESADELO;
        const d = { plan, speciesKey };

        const eyeCount = Array.isArray(plan.eyeCount)
            ? rng.int(plan.eyeCount[0], plan.eyeCount[1])
            : plan.eyeCount;
        d.eyeCount = eyeCount;

        switch(plan.archetype) {
            case 'colossus':
                d.shoulderW   = rng.range(0.52, 0.72);
                d.waistW      = rng.range(0.30, 0.45);
                d.legSpread   = rng.range(0.20, 0.35);
                d.armAngle    = rng.range(0.2, 0.6);
                d.crackLines  = Array.from({length: rng.int(6, 14)}, () =>
                    ({ x: rng.range(-0.38, 0.38), y: rng.range(-0.25, 0.25),
                       len: rng.range(0.04, 0.13), a: rng.range(0, Math.PI) }));
                d.spikes      = rng.int(2, 5);
                d.eyeY        = rng.range(0.30, 0.55);
                break;

            case 'serpentine':
                d.segCount    = rng.int(plan.segments[0], plan.segments[1]);
                d.amplitude   = rng.range(0.08, 0.18);
                d.frequency   = rng.range(0.8, 2.0);
                d.hoodFlare   = rng.range(1.4, 2.2);
                d.scaleRows   = rng.int(4, 8);
                d.fangLen     = rng.range(0.03, 0.07);
                break;

            case 'arachnid':
                d.legAngles   = [];
                for(let i = 0; i < 4; i++) {
                    const base = (-0.3 + i * 0.2) * Math.PI;
                    d.legAngles.push({ top: base + rng.range(-0.1, 0.1), bot: base + rng.range(0.3, 0.7) });
                }
                d.eyePositions = generateEyeGrid(rng, d.eyeCount, 'front');
                d.crystalSpikes = rng.int(3, 7);
                break;

            case 'medusoid':
                d.tentacleCount = rng.int(plan.tentacles[0], plan.tentacles[1]);
                d.tentacleAngles = Array.from({length: d.tentacleCount}, (_, i) =>
                    (i / d.tentacleCount) * Math.PI * 2 + rng.range(-0.1, 0.1));
                d.tentacleLengths = Array.from({length: d.tentacleCount}, () => rng.range(0.3, 0.6));
                d.rimDots       = rng.int(12, 24);
                d.veinCount     = rng.int(4, 8);
                break;

            case 'distributed':
                const coreCount = rng.int(plan.cores[0], plan.cores[1]);
                d.coreCount     = coreCount;
                d.cores         = Array.from({length: coreCount}, () => ({
                    x: rng.range(-0.42, 0.42), y: rng.range(-0.42, 0.42),
                    r: rng.range(0.045, 0.10), hasEye: rng.next() > 0.4
                }));
                d.connections   = [];
                for(let i = 0; i < coreCount; i++)
                    for(let j = i+1; j < coreCount; j++)
                        if(rng.next() > 0.55) d.connections.push([i, j]);
                break;

            case 'eldritch':
                d.pieces = Array.from({length: rng.int(4, 9)}, () => ({
                    x: rng.range(-0.40, 0.40), y: rng.range(-0.45, 0.45),
                    r: rng.range(0.04, 0.16), sides: rng.int(3, 7),
                    rot: rng.range(0, Math.PI * 2), floating: rng.next() > 0.5
                }));
                d.eyePositions = Array.from({length: d.eyeCount}, () => ({
                    x: rng.range(-0.35, 0.35), y: rng.range(-0.38, 0.38),
                    r: rng.range(0.04, 0.10)
                }));
                d.voidTears = Array.from({length: rng.int(2, 5)}, () => ({
                    x: rng.range(-0.40, 0.40), y: rng.range(-0.40, 0.40),
                    len: rng.range(0.06, 0.18), a: rng.range(0, Math.PI * 2)
                }));
                break;

            case 'hive_organism':
                d.shoulderW   = rng.range(0.42, 0.58);
                d.wingSpan    = rng.range(0.55, 0.85);
                d.antennaLen  = rng.range(0.12, 0.22);
                d.hexSize     = rng.range(0.06, 0.09);
                d.stingerLen  = rng.range(0.08, 0.16);
                break;

            case 'vortical':
                d.ringCount   = rng.int(plan.rings[0], plan.rings[1]);
                d.ringGap     = rng.range(0.06, 0.11);
                d.debris      = Array.from({length: rng.int(8, 18)}, () => ({
                    angle: rng.range(0, Math.PI * 2), dist: rng.range(0.25, 0.50),
                    size: rng.range(0.01, 0.025), speed: rng.range(0.3, 1.5)
                }));
                break;

            case 'mycelial':
                d.capSegments = rng.int(5, 10);
                d.spotCount   = rng.int(4, 12);
                d.spots       = Array.from({length: d.spotCount}, () =>
                    ({ x: rng.range(-0.22, 0.22), y: rng.range(-0.10, 0.10), r: rng.range(0.02, 0.05) }));
                d.rootCount   = rng.int(4, 8);
                d.roots       = Array.from({length: d.rootCount}, () =>
                    ({ angle: rng.range(Math.PI * 0.6, Math.PI * 1.4), len: rng.range(0.12, 0.28),
                       spread: rng.range(0.04, 0.12) }));
                d.eyeY        = rng.range(0.2, 0.5);
                break;

            case 'recursive':
                d.baseSides   = rng.int(3, 6);
                d.fracDepth   = rng.int(plan.depth[0], plan.depth[1]);
                d.rotSpeed    = rng.range(0.2, 0.8) * (rng.next() > 0.5 ? 1 : -1);
                d.eyePositions = generateFractalEyePositions(rng, d.eyeCount);
                break;
        }
        return d;
    }

    function generateEyeGrid(rng, count, pattern) {
        const positions = [];
        const cols = count <= 2 ? count : Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        let n = 0;
        for(let r = 0; r < rows && n < count; r++) {
            for(let c = 0; c < cols && n < count; c++, n++) {
                positions.push({
                    x: (c / Math.max(cols-1,1) - 0.5) * 0.28 + rng.range(-0.02, 0.02),
                    y: (r / Math.max(rows-1,1) - 0.5) * 0.14 + rng.range(-0.02, 0.02),
                    r: rng.range(0.025, 0.05)
                });
            }
        }
        return positions;
    }

    function generateFractalEyePositions(rng, count) {
        const positions = [{ x: 0, y: 0, r: 0.07 }];
        if(count > 1) {
            const ring1 = Math.min(count - 1, 4);
            for(let i = 0; i < ring1; i++) {
                const a = (i / ring1) * Math.PI * 2 + rng.range(-0.1, 0.1);
                positions.push({ x: Math.cos(a)*0.22, y: Math.sin(a)*0.22, r: 0.035 });
            }
        }
        if(count > 5) {
            const ring2 = count - 5;
            for(let i = 0; i < ring2; i++) {
                const a = (i / ring2) * Math.PI * 2 + rng.range(-0.1, 0.1);
                positions.push({ x: Math.cos(a)*0.40, y: Math.sin(a)*0.40, r: 0.020 });
            }
        }
        return positions.slice(0, count);
    }

    // =================================================================
    // GERADOR DE NOMES PROCEDURAIS
    // =================================================================
    
    const NAME_PREFIXES = [
        'Xeno', 'Bio', 'Cryo', 'Pyro', 'Hydro', 'Aero', 'Geo', 'Neuro',
        'Techno', 'Chrono', 'Quantum', 'Void', 'Nova', 'Omega', 'Alpha',
        'Mega', 'Ultra', 'Proto', 'Arche', 'Paleo', 'Neo'
    ];
    
    const NAME_ROOTS = [
        'morph', 'derm', 'pod', 'ptera', 'saur', 'rex', 'don', 'thera',
        'tron', 'zoid', 'mech', 'phage', 'spore', 'blast', 'cell',
        'vore', 'cide', 'form', 'sphere', 'core', 'wyrm', 'naut'
    ];
    
    const NAME_SUFFIXES = [
        'us', 'is', 'os', 'on', 'ix', 'ax', 'ex', 'oid', 'ian',
        'ite', 'ate', 'ium', 'sis', 'ant', 'ent', 'ar', 'or'
    ];
    
    function generateBossName(rng) {
        const prefix = rng.choice(NAME_PREFIXES);
        const root = rng.choice(NAME_ROOTS);
        const suffix = rng.choice(NAME_SUFFIXES);
        return prefix + root + suffix;
    }

    // =================================================================
    // GERADOR DE ESTRUTURAS PROCEDURAIS
    // =================================================================
    
    function generateProceduralStructure(rng, complexity, forcedType) {
        const structureTypes = [
            'radial', 'serpentine', 'clustered', 'spiral', 'fractal',
            'web', 'tree', 'crystalline', 'blob', 'segmented'
        ];
        
        const type = forcedType || rng.choice(structureTypes);
        const points = [];
        let idCounter = 0;
        
        const numPoints = rng.int(50, 200);
        
        switch(type) {
            case 'radial':
                const numArms = rng.int(4, 12);
                for(let arm = 0; arm < numArms; arm++) {
                    const angle = (arm / numArms) * Math.PI * 2;
                    const armLength = rng.range(200, 400);
                    const segments = rng.int(10, 20);
                    
                    for(let i = 0; i < segments; i++) {
                        const dist = (i / segments) * armLength;
                        const spread = rng.range(0, 50) * (i / segments);
                        points.push({
                            x: 500 + Math.cos(angle) * dist + rng.range(-spread, spread),
                            y: 500 + Math.sin(angle) * dist + rng.range(-spread, spread),
                            id: idCounter++,
                            armId: arm,
                            segmentPos: i / segments
                        });
                    }
                }
                break;
                
            case 'serpentine':
                const segments = rng.int(40, 100);
                for(let i = 0; i < segments; i++) {
                    const t = i / segments;
                    points.push({
                        x: 500 + rng.range(-50, 50),
                        y: 100 + t * 800,
                        id: idCounter++,
                        segmentPos: t
                    });
                }
                break;
                
            case 'clustered':
                const clusters = rng.int(3, 8);
                for(let c = 0; c < clusters; c++) {
                    const cx = rng.range(300, 700);
                    const cy = rng.range(300, 700);
                    const clusterSize = rng.int(15, 30);
                    
                    for(let i = 0; i < clusterSize; i++) {
                        points.push({
                            x: cx + rng.range(-100, 100),
                            y: cy + rng.range(-100, 100),
                            id: idCounter++,
                            clusterId: c
                        });
                    }
                }
                break;
                
            case 'spiral':
                const spiralTurns = rng.range(3, 8);
                const spiralPoints = rng.int(60, 120);
                for(let i = 0; i < spiralPoints; i++) {
                    const t = i / spiralPoints;
                    const angle = t * Math.PI * 2 * spiralTurns;
                    const radius = t * 400;
                    points.push({
                        x: 500 + Math.cos(angle) * radius,
                        y: 500 + Math.sin(angle) * radius,
                        id: idCounter++,
                        spiralPos: t
                    });
                }
                break;
                
            case 'fractal':
                function addFractalPoints(x, y, size, depth) {
                    if(depth > 4) {
                        points.push({ x, y, id: idCounter++, fractalDepth: depth });
                        return;
                    }
                    const branches = rng.int(2, 4);
                    for(let i = 0; i < branches; i++) {
                        const angle = (i / branches) * Math.PI * 2 + rng.range(-0.5, 0.5);
                        const newSize = size * rng.range(0.4, 0.7);
                        const nx = x + Math.cos(angle) * size;
                        const ny = y + Math.sin(angle) * size;
                        addFractalPoints(nx, ny, newSize, depth + 1);
                    }
                }
                addFractalPoints(500, 500, 150, 0);
                break;
                
            case 'web':
                const webRings = rng.int(4, 8);
                const webSpokes = rng.int(8, 16);
                for(let ring = 0; ring < webRings; ring++) {
                    const radius = (ring + 1) * 50;
                    for(let spoke = 0; spoke < webSpokes; spoke++) {
                        const angle = (spoke / webSpokes) * Math.PI * 2;
                        points.push({
                            x: 500 + Math.cos(angle) * radius,
                            y: 500 + Math.sin(angle) * radius,
                            id: idCounter++,
                            ring: ring,
                            spoke: spoke
                        });
                    }
                }
                break;
                
            case 'tree':
                function addBranch(x, y, angle, depth, size) {
                    if(depth > 5) return;
                    const len = size / (depth + 1);
                    const endX = x + Math.cos(angle) * len;
                    const endY = y + Math.sin(angle) * len;
                    
                    points.push({ x, y, id: idCounter++, depth, isBranch: true });
                    points.push({ x: endX, y: endY, id: idCounter++, depth, isBranch: true });
                    
                    const branches = rng.int(2, 3);
                    for(let i = 0; i < branches; i++) {
                        addBranch(endX, endY, angle + rng.range(-0.8, 0.8), depth + 1, size);
                    }
                }
                addBranch(500, 800, -Math.PI/2, 0, 150);
                break;
                
            case 'crystalline':
                const crystals = rng.int(5, 12);
                for(let c = 0; c < crystals; c++) {
                    const cx = rng.range(300, 700);
                    const cy = rng.range(300, 700);
                    const sides = rng.int(3, 8);
                    const size = rng.range(30, 80);
                    
                    for(let i = 0; i < sides; i++) {
                        const angle = (i / sides) * Math.PI * 2;
                        points.push({
                            x: cx + Math.cos(angle) * size,
                            y: cy + Math.sin(angle) * size,
                            id: idCounter++,
                            crystalId: c,
                            isCrystal: true
                        });
                    }
                }
                break;
                
            case 'blob':
                const blobPoints = rng.int(80, 150);
                for(let i = 0; i < blobPoints; i++) {
                    const angle = rng.range(0, Math.PI * 2);
                    const dist = rng.range(0, 250) * Math.sqrt(rng.next());
                    points.push({
                        x: 500 + Math.cos(angle) * dist,
                        y: 500 + Math.sin(angle) * dist,
                        id: idCounter++,
                        isBlob: true
                    });
                }
                break;
                
            case 'segmented':
                const numSegments = rng.int(10, 20);
                const segmentSize = rng.range(30, 60);
                for(let seg = 0; seg < numSegments; seg++) {
                    const sy = 200 + seg * segmentSize;
                    const segPoints = rng.int(5, 15);
                    for(let i = 0; i < segPoints; i++) {
                        points.push({
                            x: 500 + rng.range(-100, 100),
                            y: sy + rng.range(-20, 20),
                            id: idCounter++,
                            segmentId: seg,
                            segmentPos: seg / numSegments
                        });
                    }
                }
                break;
        }
        
        return { type, points };
    }
	
    // =================================================================
    // GERADOR DE PALETAS (CORRIGIDO PARA O CANVAS)
    // =================================================================
    
    // Função auxiliar que previne o Crash do Canvas convertendo HSL para Hex
    function hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    function generateColorPalette(rng, preferredTypes) {
        const paletteTypes = preferredTypes || ['neon', 'organic', 'crystal', 'fire', 'void', 'toxic', 'electric'];
        const type = rng.choice(paletteTypes);
        
        // ✅ Usando hslToHex! O Canvas nunca mais vai travar no andar 18!
        const palettes = {
            neon: { p: hslToHex(rng.int(0, 360), 100, 60), s: hslToHex(rng.int(0, 360), 80, 40), h: '#ffffff', bg: '#000510' },
            organic: { p: hslToHex(rng.int(80, 140), 70, 50), s: hslToHex(rng.int(20, 60), 60, 40), h: '#ffff88', bg: '#0a0a05' },
            crystal: { p: hslToHex(rng.int(180, 240), 80, 70), s: '#ffffff', h: '#ffffff', bg: '#050a15' },
            fire: { p: hslToHex(rng.int(0, 30), 100, 60), s: hslToHex(rng.int(30, 60), 90, 50), h: '#ffff00', bg: '#0a0000' },
            void: { p: hslToHex(rng.int(250, 290), 80, 50), s: '#000000', h: hslToHex(rng.int(290, 330), 100, 60), bg: '#000000' },
            toxic: { p: hslToHex(rng.int(70, 130), 100, 50), s: hslToHex(rng.int(250, 290), 70, 40), h: '#ccff00', bg: '#000a0a' },
            electric: { p: hslToHex(rng.int(170, 210), 100, 60), s: hslToHex(rng.int(40, 60), 100, 60), h: '#ffffff', bg: '#050505' }
        };
        
        return palettes[type];
    }

    // =================================================================
    // GERADOR DE COMPORTAMENTOS
    // =================================================================
    
    function generateBehavior(rng, preferredBehaviors) {
        const behaviors = preferredBehaviors || [
            'pulse', 'wave', 'spiral', 'jitter', 'breathe',
            'orbit', 'chaos', 'flow', 'vibrate', 'morph'
        ];
        
        return {
            type: rng.choice(behaviors),
            speed: rng.range(0.5, 3),
            amplitude: rng.range(10, 50),
            frequency: rng.range(0.5, 3)
        };
    }

    // =================================================================
    // CLASSE DO BOSS PROCEDURAL
    // =================================================================
    
    class ProceduralBoss {
        constructor(seed, forcedSpeciesKey) {
            this.seed = seed || Math.floor(Math.random() * 2147483647);
            this.rng = new SeededRandom(this.seed);
            
            // Determina a espécie
            const speciesKey = forcedSpeciesKey || (lockedSpecies) || SPECIES_KEYS[Math.floor(this.rng.next() * SPECIES_KEYS.length)];
            this.speciesKey = speciesKey;
            this.species = SPECIES_CATALOG[speciesKey];
            
            // Nome: prefixo da espécie + sufixo procedural
            this.name = this.species.name + '-' + this.generateSpeciesCode();
            this.complexity = Math.max(this.species.complexityMin, this.rng.range(0.3, 1));
            
            // Estrutura constrangida pela espécie
            const structureType = this.rng.choice(this.species.structures);
            const structureData = generateProceduralStructure(this.rng, this.complexity, structureType);
            this.structureType = structureData.type;
            this.rawPoints = structureData.points;
            
            // Paleta constrangida pela espécie
            this.palette = generateColorPalette(this.rng, this.species.palettes);
            
            // Comportamento constrangido pela espécie
            this.behavior = generateBehavior(this.rng, this.species.behaviors);
            this.renderStyle = this.rng.choice(this.species.renderStyles);
            
            this.processPoints();
            // Gera estrutura anatômica determinística
            this.bodyData = generateBodyData(new SeededRandom(this.seed + 9999), this.speciesKey);
        }
        
        generateSpeciesCode() {
            const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const digits = '0123456789';
            return this.rng.choice(letters.split('')) + 
                   this.rng.int(10, 99) + 
                   this.rng.choice(letters.split(''));
        }
        
        processPoints() {
            if(this.rawPoints.length === 0) {
                this.processedPoints = [];
                return;
            }
            
            const xs = this.rawPoints.map(p => p.x);
            const ys = this.rawPoints.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            
            this.processedPoints = this.rawPoints.map(p => {
                const relY = (p.y - minY) / (maxY - minY || 1);
                let bodyType = 'BODY';
                if (relY < 0.15) bodyType = 'HEAD';
                else if (relY > 0.85) bodyType = 'TAIL';
                
                return {
                    ...p,
                    relX: (p.x - minX) / (maxX - minX || 1),
                    relY: relY,
                    bodyType: bodyType,
                    sizeVar: 0.7 + this.rng.next() * 0.6,
                    animPhase: this.rng.next() * Math.PI * 2
                };
            });
        }
        
        animate(p, scale, time) {
            let animX = 0, animY = 0;
            
            switch(this.behavior.type) {
                case 'pulse':
                    const pulse = Math.sin(time * this.behavior.speed);
                    animX = (p.relX - 0.5) * pulse * this.behavior.amplitude;
                    animY = (p.relY - 0.5) * pulse * this.behavior.amplitude;
                    break;
                    
                case 'wave':
                    if(p.segmentPos !== undefined) {
                        animX = Math.sin(time * this.behavior.speed + p.segmentPos * Math.PI * 4) * this.behavior.amplitude;
                        animY = Math.cos(time * this.behavior.speed * 0.7 + p.segmentPos * Math.PI * 2) * this.behavior.amplitude * 0.5;
                    }
                    break;
                    
                case 'spiral':
                    const angle = Math.atan2(p.relY - 0.5, p.relX - 0.5) + time * this.behavior.speed * 0.5;
                    const dist = Math.sqrt((p.relX-0.5)**2 + (p.relY-0.5)**2) * scale;
                    animX = Math.cos(angle) * dist - (p.relX - 0.5) * scale * 0.8;
                    animY = Math.sin(angle) * dist - (p.relY - 0.5) * scale;
                    break;
                    
                case 'jitter':
                    animX = Math.sin(time * this.behavior.frequency * 10 + p.animPhase) * this.behavior.amplitude * 0.5;
                    animY = Math.cos(time * this.behavior.frequency * 10 + p.animPhase) * this.behavior.amplitude * 0.5;
                    break;
                    
                case 'breathe':
                    const breathe = Math.sin(time * this.behavior.speed);
                    animX = (p.relX - 0.5) * breathe * this.behavior.amplitude * 0.5;
                    animY = (p.relY - 0.5) * breathe * this.behavior.amplitude * 0.5;
                    break;
                    
                case 'orbit':
                    if(p.armId !== undefined) {
                        const orbitAngle = time * this.behavior.speed + p.armId;
                        animX = Math.cos(orbitAngle) * this.behavior.amplitude * p.segmentPos;
                        animY = Math.sin(orbitAngle) * this.behavior.amplitude * p.segmentPos;
                    }
                    break;
                    
                case 'chaos':
                    animX = Math.sin(time * this.behavior.frequency * 5 + p.id * 0.1) * this.behavior.amplitude;
                    animY = Math.cos(time * this.behavior.frequency * 7 + p.id * 0.15) * this.behavior.amplitude;
                    break;
                    
                case 'flow':
                    const flowAngle = time * this.behavior.speed;
                    animX = Math.sin(flowAngle + p.relY * Math.PI * 2) * this.behavior.amplitude;
                    animY = Math.cos(flowAngle + p.relX * Math.PI * 2) * this.behavior.amplitude * 0.5;
                    break;
                    
                case 'vibrate':
                    const vib = Math.sin(time * this.behavior.frequency * 15);
                    animX = vib * this.behavior.amplitude * 0.3;
                    animY = vib * this.behavior.amplitude * 0.3;
                    break;
                    
                case 'morph':
                    const morph = Math.sin(time * this.behavior.speed * 0.5);
                    animX = (p.relX - 0.5) * morph * this.behavior.amplitude * 2;
                    animY = (p.relY - 0.5) * -morph * this.behavior.amplitude * 2;
                    break;
            }
            
            return { animX, animY };
        }
        
        draw(ctx, p, x, y, size, scale) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.palette.p;
            
            switch(this.renderStyle) {
                case 'smooth':
                    ctx.fillStyle = p.bodyType === 'HEAD' ? this.palette.h : this.palette.p;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'pixelated':
                    const pixelSize = Math.max(2, Math.floor(size));
                    ctx.fillStyle = p.bodyType === 'HEAD' ? this.palette.h : this.palette.p;
                    ctx.fillRect(Math.floor(x), Math.floor(y), pixelSize, pixelSize);
                    break;
                    
                case 'glow':
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = this.palette.p;
                    ctx.shadowBlur = 25;
                    ctx.beginPath();
                    ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                    break;
                    
                case 'geometric':
                    const sides = 3 + Math.floor(p.sizeVar * 5);
                    ctx.fillStyle = p.bodyType === 'HEAD' ? this.palette.h : this.palette.s;
                    ctx.strokeStyle = this.palette.p;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for(let i = 0; i < sides; i++) {
                        const angle = (i / sides) * Math.PI * 2;
                        const px = x + Math.cos(angle) * size;
                        const py = y + Math.sin(angle) * size;
                        if(i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
        }
        
        mutate(mutationRate = 0.3) {
            // Cria uma nova seed baseada na atual
            const newSeed = this.seed + Math.floor(Math.random() * 10000);
            const newBoss = new ProceduralBoss(newSeed);
            
            // Mantém algumas características do boss original
            if(Math.random() > mutationRate) {
                newBoss.structureType = this.structureType;
            }
            if(Math.random() > mutationRate) {
                newBoss.palette = {...this.palette};
            }
            if(Math.random() > mutationRate) {
                newBoss.behavior = {...this.behavior};
            }
            
            return newBoss;
        }
        
        getDNA() {
            return `${this.speciesKey.substr(0,3)}-${this.structureType.substr(0,3).toUpperCase()}-${this.behavior.type.substr(0,3).toUpperCase()}`;
        }
    }
