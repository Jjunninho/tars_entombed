// ============================================================
// 🎨 SISTEMA DE DECORAÇÕES
// ============================================================
// getCurrentBiomeByDepth() disponível globalmente via biomes-data.js

const WATER_BIOMES = new Set(['waterfall']); // Tipos de decor que ativam água

// ============================================================
// TRAÇADOR DE CAMINHO DA ÁGUA
// Percorre as plataformas do chunk e gera segmentos fall/flow
// ============================================================
function traceWaterPath(startX, startY, platforms, rng, maxBounces) {
    const segments = [];
    let x = startX;
    let y = startY;

    for (let bounce = 0; bounce < maxBounces; bounce++) {

        // Plataforma mais próxima abaixo do ponto atual
        const landing = platforms
            .filter(p => x >= p.x && x <= p.x + p.w && p.y > y + 2)
            .sort((a, b) => a.y - b.y)[0];

        const fallEndY = landing ? landing.y : y + 400;

        // ── SEGMENTO VERTICAL (queda) ──────────────────────────
        if (fallEndY - y > 4) {
            segments.push({
                type: 'fall',
                x,
                startY: y,
                endY: fallEndY,
                len: fallEndY - y
            });
        }

        if (!landing) break; // Saiu do chunk — para o traçado

        y = landing.y;

        // ── SEGMENTO HORIZONTAL (desliza sobre plataforma) ─────
        // Escolhe a borda mais próxima (com leve aleatoriedade)
        const distLeft  = x - landing.x;
        const distRight = (landing.x + landing.w) - x;

        let goRight;
        if (distLeft  < 8)  goRight = true;
        else if (distRight < 8) goRight = false;
        else goRight = rng() < 0.5;

        const endX = goRight ? landing.x + landing.w : landing.x;
        const flowLen = Math.abs(endX - x);

        if (flowLen > 4) {
            segments.push({
                type: 'flow',
                startX: x,
                endX,
                y,
                len: flowLen,
                dir: goRight ? 1 : -1
            });
        }

        x = endX;
        // A água cai a partir da borda da plataforma
    }

    return segments;
}

// ============================================================
// GERAÇÃO POR CHUNK
// ============================================================
function generateDecorationsForChunk(chunk, platforms, rng) {
    const decorations = [];
    const chunkTop = chunk.y;
    const biome = getCurrentBiomeByDepth(Math.floor(chunkTop / 10));

    if (!biome || !biome.decor) return decorations;

    const hasWater = biome.decor.includes('waterfall');

    // ── 1. ÁGUA FLUINDO (nova lógica) ─────────────────────────
    if (hasWater && platforms.length > 0) {
        // Plataformas no terço superior do chunk — boas como nascentes
        const sourcePlatforms = platforms
            .filter(p => p.y < chunkTop + 180 && p.w > 60)
            .sort((a, b) => a.y - b.y);

        const sourceCount = 1 + Math.floor(rng() * 3); // 1–3 fontes por chunk

        for (let s = 0; s < sourceCount && s < sourcePlatforms.length; s++) {
            const sp = sourcePlatforms[s];

            // Ponto de origem: posição aleatória dentro da plataforma
            const srcX  = sp.x + 10 + rng() * Math.max(sp.w - 20, 1);
            const srcY  = sp.y; // Topo da plataforma
            const phase = rng() * Math.PI * 2;

            const segments = traceWaterPath(
                srcX, srcY, platforms, rng,
                4 + Math.floor(rng() * 4) // 4–7 bounces
            );

            if (segments.length > 0) {
                decorations.push({
                    kind: 'waterflow',
                    segments,
                    phase,
                    color: biome.particleColor,
                    chunkId: chunk.id
                });
            }
        }
    }

    // ── 2. DECORAÇÕES DE FUNDO (bg) ───────────────────────────
    const bgCount = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < bgCount; i++) {
        const type = biome.decor[Math.floor(rng() * biome.decor.length)];
        if (type === 'waterfall') continue; // Água já tratada acima

        decorations.push({
            kind: 'bg',
            type,
            x: 50 + rng() * 700,
            y: chunkTop + rng() * 520,
            size: 8 + rng() * 20,
            phase: rng() * Math.PI * 2,
            color: biome.particleColor,
            chunkId: chunk.id
        });
    }

    // ── 3. DECORAÇÕES ACOPLADAS ÀS PLATAFORMAS ────────────────
    for (let p of platforms) {
        if (rng() > 0.7) continue;

        const type = biome.decor[Math.floor(rng() * biome.decor.length)];

        if (['vine', 'wire', 'tendril'].includes(type)) {
            const count = 1 + Math.floor(rng() * 2);
            for (let j = 0; j < count; j++) {
                decorations.push({
                    kind: 'hang',
                    type,
                    x: p.x + 5 + rng() * (p.w - 10),
                    y: p.y + p.h,
                    len: 30 + rng() * 70,
                    phase: rng() * Math.PI * 2,
                    color: biome.particleColor,
                    chunkId: chunk.id
                });
            }
        }

        if (['crystal', 'shard', 'star', 'circuit', 'panel'].includes(type)) {
            decorations.push({
                kind: 'ontop',
                type,
                x: p.x + p.w / 2,
                y: p.y,
                size: 10 + rng() * 12,
                phase: rng() * Math.PI * 2,
                color: biome.particleColor,
                chunkId: chunk.id
            });
        }
    }

    return decorations;
}

// ============================================================
// DRAW DE UM SEGMENTO DE QUEDA  (partículas verticais)
// ============================================================
function drawFallSegment(ctx, seg, screenStartY, t, phase, color) {
    const SPACING   = 11;  // distância entre partículas no fio
    const SPEED     = 90;  // px/s
    const STREAMS   = 2;   // fios paralelos por queda
    const WIDTH     = [3, 2]; // largura de cada fio

    for (let st = 0; st < STREAMS; st++) {
        const offsetX  = st * 3 - 1;        // fios levemente separados
        const phOffset = st * Math.PI * 0.4; // fase deslocada
        const count    = Math.ceil(seg.len / SPACING) + 1;

        for (let k = 0; k < count; k++) {
            // Posição da partícula ao longo do segmento (0..len)
            const pos = ((t * SPEED + phase * 30 + phOffset * 20 + k * SPACING) % seg.len + seg.len) % seg.len;

            // Alfa: 0 no topo, máximo no meio, 0 no fim (efeito de profundidade)
            const progress = pos / seg.len;
            const alpha    = 0.7 * Math.sin(progress * Math.PI);

            // Leve ondulação lateral
            const wave = Math.sin(t * 3 + phase + k * 0.6) * 1.5;

            ctx.globalAlpha = alpha;
            ctx.fillStyle   = color;
            ctx.fillRect(
                seg.x + offsetX + wave - WIDTH[st] * 0.5,
                screenStartY + pos,
                WIDTH[st],
                SPACING * 0.7
            );
        }
    }
}

// ============================================================
// DRAW DE UM SEGMENTO DE FLUXO  (partículas horizontais)
// ============================================================
function drawFlowSegment(ctx, seg, screenY, t, phase, color) {
    const SPACING = 10;
    const SPEED   = 55;  // mais lento que a queda
    const count   = Math.ceil(seg.len / SPACING) + 1;

    for (let k = 0; k < count; k++) {
        const pos      = ((t * SPEED * seg.dir + phase * 25 + k * SPACING) % seg.len + seg.len) % seg.len;
        const progress = pos / seg.len;
        const alpha    = 0.55 * Math.sin(progress * Math.PI);

        // Leve ondulação vertical
        const wave = Math.sin(t * 4 + phase + k * 0.7) * 1.2;

        const drawX = seg.dir > 0
            ? seg.startX + pos
            : seg.startX - pos;

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = color;
        ctx.fillRect(drawX - 1, screenY + wave, SPACING * 0.65, 3);
    }
}

// ============================================================
// SPLASH  (impacto no início de cada queda)
// ============================================================
function drawSplash(ctx, x, screenY, t, phase, color) {
    const ARMS  = 5;
    const pulse = (Math.sin(t * 5 + phase) + 1) * 0.5; // 0..1 oscilando

    for (let i = 0; i < ARMS; i++) {
        const angle  = (i / ARMS) * Math.PI + Math.PI; // semicírculo para baixo
        const len    = 5 + pulse * 7;
        const alpha  = 0.5 * (1 - pulse);

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, screenY);
        ctx.lineTo(
            x + Math.cos(angle) * len,
            screenY + Math.abs(Math.sin(angle)) * len
        );
        ctx.stroke();
    }
}

// ============================================================
// DRAW PRINCIPAL
// ============================================================
function drawDecorations(ctx, decorations, cameraY) {
    if (!decorations || decorations.length === 0) return;

    const now = Date.now();
    const t   = now * 0.001; // segundos

    ctx.save();

    for (const d of decorations) {

        // ── WATER FLOW ──────────────────────────────────────────
        if (d.kind === 'waterflow') {
            for (const seg of d.segments) {

                if (seg.type === 'fall') {
                    const screenStartY = seg.startY - cameraY;
                    const screenEndY   = seg.endY   - cameraY;

                    // Culling: pula se totalmente fora da tela
                    if (screenEndY < -20 || screenStartY > 560) continue;

                    drawFallSegment(ctx, seg, screenStartY, t, d.phase, d.color);

                    // Splash no ponto de impacto
                    drawSplash(ctx, seg.x, screenEndY, t, d.phase, d.color);

                } else if (seg.type === 'flow') {
                    const screenY = seg.y - cameraY;
                    if (screenY < -20 || screenY > 560) continue;

                    drawFlowSegment(ctx, seg, screenY, t, d.phase, d.color);
                }
            }
            ctx.globalAlpha = 1;
            continue;
        }

        // ── BG ──────────────────────────────────────────────────
        if (d.kind === 'bg') {
            const screenY = d.y - cameraY;
            if (screenY < -200 || screenY > 700) continue;

            ctx.globalAlpha = 0.2;
            ctx.fillStyle   = d.color;
            ctx.beginPath();
            ctx.arc(d.x, screenY, d.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            continue;
        }

        // ── HANG / ONTOP ────────────────────────────────────────
        if (d.kind === 'hang' || d.kind === 'ontop') {
            const screenY = d.y - cameraY;
            if (screenY < -200 || screenY > 700) continue;

            ctx.globalAlpha = 0.5;
            ctx.fillStyle   = d.color;
            ctx.fillRect(
                d.x - 2,
                screenY - (d.kind === 'ontop' ? 10 : 0),
                4,
                d.len || 10
            );
        }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

// ============================================================
window.EntitiesDecorations = {
    generateDecorations: generateDecorationsForChunk,
    drawDecorations
};
