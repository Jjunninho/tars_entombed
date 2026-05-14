// ============================================================
// 🎨 RENDERIZADOR ANATÔMICO — TARS Entombed
// Arquivo: boss-renderer.js
// Depende de: boss-procedural.js (para acessar tipos de boss)
// ============================================================

    // =================================================================
    // SISTEMA DE RENDERIZAÇÃO ANATÔMICA
    // =================================================================

    function drawEye(ctx, x, y, r, eyeShape, palette, time, phase) {
        const p = phase || 0;
        const pulse = 0.85 + Math.sin(time * 2.5 + p) * 0.15;
        const rp = r * pulse;

        ctx.save();
        ctx.translate(x, y);

        switch(eyeShape) {
            case 'slit_v': {
                ctx.beginPath();
                ctx.ellipse(0, 0, rp, rp * 0.7, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rp * 0.65);
                grd.addColorStop(0, '#ff2200');
                grd.addColorStop(1, '#880000');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.ellipse(0, 0, rp * 0.18, rp * 0.58, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'small_round': {
                const grd = ctx.createRadialGradient(0, 0, rp * 0.1, 0, 0, rp);
                grd.addColorStop(0, '#ffffff');
                grd.addColorStop(0.3, palette.p);
                grd.addColorStop(1, '#000000');
                ctx.beginPath();
                ctx.arc(0, 0, rp, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(-rp*0.3, -rp*0.3, rp*0.22, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fill();
                break;
            }
            case 'god_eye': {
                ctx.beginPath();
                ctx.arc(0, 0, rp * 1.1, 0, Math.PI * 2);
                ctx.strokeStyle = palette.p;
                ctx.lineWidth = r * 0.12;
                ctx.shadowBlur = r * 3;
                ctx.shadowColor = palette.p;
                ctx.stroke();
                const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rp);
                grd.addColorStop(0, '#ffffff');
                grd.addColorStop(0.25, palette.h || '#ffff00');
                grd.addColorStop(0.6, palette.p);
                grd.addColorStop(1, '#000000');
                ctx.beginPath();
                ctx.arc(0, 0, rp, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
                break;
            }
            case 'sensor': {
                ctx.beginPath();
                ctx.arc(0, 0, rp, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, rp * 0.55, 0, Math.PI * 2);
                ctx.fillStyle = palette.p;
                ctx.shadowBlur = rp * 4;
                ctx.shadowColor = palette.p;
                ctx.fill();
                const scanY = Math.sin(time * 3 + p) * rp * 0.7;
                ctx.beginPath();
                ctx.moveTo(-rp * 0.8, scanY);
                ctx.lineTo(rp * 0.8, scanY);
                ctx.strokeStyle = 'rgba(0,255,0,0.5)';
                ctx.lineWidth = rp * 0.12;
                ctx.stroke();
                break;
            }
            case 'void_iris': {
                for(let i = 0; i < 3; i++) {
                    const ri = rp * (1.2 - i * 0.2);
                    const off = Math.sin(time * 1.5 + i + p) * rp * 0.08;
                    ctx.beginPath();
                    ctx.arc(off, off, ri, 0, Math.PI * 2);
                    ctx.strokeStyle = `hsla(${270 + i*30}, 100%, ${50+i*10}%, ${0.3 + i*0.2})`;
                    ctx.lineWidth = rp * 0.1;
                    ctx.shadowBlur = rp * 2;
                    ctx.shadowColor = palette.p;
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(0, 0, rp * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();
                break;
            }
            case 'compound': {
                const hexR = rp * 0.32;
                const positions = [[0,0],[hexR*1.8,0],[-hexR*1.8,0],[hexR*0.9,-hexR*1.56],[hexR*0.9,hexR*1.56],[-hexR*0.9,-hexR*1.56],[-hexR*0.9,hexR*1.56]];
                positions.slice(0, 7).forEach(([ex, ey]) => {
                    ctx.beginPath();
                    for(let s = 0; s < 6; s++) {
                        const a = s * Math.PI / 3;
                        s === 0 ? ctx.moveTo(ex + Math.cos(a)*hexR*0.85, ey + Math.sin(a)*hexR*0.85)
                                : ctx.lineTo(ex + Math.cos(a)*hexR*0.85, ey + Math.sin(a)*hexR*0.85);
                    }
                    ctx.closePath();
                    const grd = ctx.createRadialGradient(ex, ey, 0, ex, ey, hexR);
                    grd.addColorStop(0, palette.p);
                    grd.addColorStop(1, '#111');
                    ctx.fillStyle = grd;
                    ctx.fill();
                });
                break;
            }
            case 'singularity': {
                for(let i = 8; i > 0; i--) {
                    const ri = rp * i / 8;
                    const hue = (i / 8) * 60;
                    ctx.beginPath();
                    ctx.arc(0, 0, ri, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${180+hue}, 100%, ${20 + i*5}%, 0.15)`;
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(0, 0, rp * 0.12, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.shadowBlur = rp * 5;
                ctx.shadowColor = '#000000';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, rp * 0.45, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(180, 100%, 60%, 0.6)`;
                ctx.lineWidth = rp * 0.08;
                ctx.shadowBlur = rp * 2;
                ctx.shadowColor = palette.p;
                ctx.stroke();
                break;
            }
            case 'spore': {
                const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rp);
                grd.addColorStop(0, '#ffffff');
                grd.addColorStop(0.4, palette.p);
                grd.addColorStop(1, '#001100');
                ctx.beginPath();
                ctx.arc(0, 0, rp, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rp * 0.1, 0, rp * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();
                break;
            }
            case 'infinite': {
                ctx.save();
                ctx.rotate(time * 0.5 + p);
                for(let s = 0; s < 20; s++) {
                    const t = s / 20;
                    const a = t * Math.PI * 6;
                    const rad = t * rp;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a)*rad*0.1, Math.sin(a)*rad*0.1, rad * 0.25, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${t*360}, 100%, 60%, ${0.6 - t * 0.4})`;
                    ctx.fill();
                }
                ctx.restore();
                ctx.beginPath();
                ctx.arc(0, 0, rp * 0.18, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();
                break;
            }
            default: {
                const grd = ctx.createRadialGradient(-rp*0.2, -rp*0.2, rp*0.05, 0, 0, rp);
                grd.addColorStop(0, '#ffffff');
                grd.addColorStop(0.3, palette.p);
                grd.addColorStop(0.7, '#000000');
                ctx.beginPath();
                ctx.arc(0, 0, rp, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
            }
        }

        ctx.beginPath();
        ctx.arc(0, 0, rp * 1.6, 0, Math.PI * 2);
        const glowGrd = ctx.createRadialGradient(0, 0, rp, 0, 0, rp * 1.6);
        glowGrd.addColorStop(0, palette.p + '55');
        glowGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrd;
        ctx.fill();

        ctx.restore();
    }

    // =================================================================
    // RENDERIZADORES POR ARQUÉTIPO
    // =================================================================

    function drawColossus(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;
        const breathe = Math.sin(time * boss.behavior.speed * 0.5) * S * 0.008;

        const legW = S * 0.12, legH = S * 0.36;
        const legY = S * 0.14;
        [-bd.legSpread, bd.legSpread].forEach(lx => {
            ctx.beginPath();
            ctx.roundRect(lx * S - legW/2, legY, legW, legH, [legW*0.3, legW*0.3, legW*0.15, legW*0.15]);
            ctx.fillStyle = pal.s;
            ctx.fill();
            ctx.strokeStyle = pal.p;
            ctx.lineWidth = S * 0.008;
            ctx.stroke();
        });

        const tw = bd.shoulderW * S, bw = bd.waistW * S;
        const ty = -S * 0.44 + breathe, torsoH_px = S * 0.44;
        ctx.beginPath();
        ctx.moveTo(-tw/2, ty);
        ctx.lineTo( tw/2, ty);
        ctx.lineTo( bw/2, ty + torsoH_px);
        ctx.lineTo(-bw/2, ty + torsoH_px);
        ctx.closePath();
        ctx.fillStyle = pal.p;
        ctx.fill();
        ctx.strokeStyle = pal.s;
        ctx.lineWidth = S * 0.01;
        ctx.stroke();

        ctx.save();
        bd.crackLines.forEach(c => {
            ctx.beginPath();
            ctx.moveTo(c.x * S, c.y * S * 0.8 + breathe);
            ctx.lineTo(c.x * S + Math.cos(c.a) * c.len * S, c.y * S * 0.8 + breathe + Math.sin(c.a) * c.len * S);
            const intensity = 0.5 + 0.5 * Math.sin(time * 3 + c.x * 5);
            ctx.strokeStyle = `rgba(255, ${Math.floor(80 + intensity*120)}, 0, ${0.6 + intensity * 0.4})`;
            ctx.lineWidth = S * 0.005;
            ctx.shadowBlur = S * 0.03;
            ctx.shadowColor = '#ff4400';
            ctx.stroke();
        });
        ctx.restore();

        const armY = ty + S * 0.08;
        [-1, 1].forEach(side => {
            const ax = side * tw/2;
            const armTipX = ax + side * S * 0.12;
            const armTipY = armY + S * (0.28 + bd.armAngle * 0.1);
            ctx.beginPath();
            ctx.moveTo(ax, armY);
            ctx.quadraticCurveTo(ax + side * S * 0.18, armY + S * 0.15, armTipX, armTipY);
            ctx.lineWidth = S * 0.09;
            ctx.strokeStyle = pal.p;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.lineWidth = S * 0.05;
            ctx.strokeStyle = pal.s;
            ctx.stroke();
        });

        const headW = S * 0.32, headH2 = S * 0.22;
        const headY = ty - S * 0.02 + breathe;
        ctx.beginPath();
        ctx.ellipse(0, headY - headH2/2, headW/2, headH2/2, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.p;
        ctx.fill();
        ctx.strokeStyle = pal.s;
        ctx.lineWidth = S * 0.01;
        ctx.stroke();

        for(let i = 0; i < bd.spikes; i++) {
            const px = (-0.5 + i / Math.max(bd.spikes-1,1)) * headW * 0.7;
            const spikeH = S * (0.04 + (i%2) * 0.04);
            ctx.beginPath();
            ctx.moveTo(px - S*0.025, headY - headH2 * 0.85);
            ctx.lineTo(px, headY - headH2 * 0.85 - spikeH);
            ctx.lineTo(px + S*0.025, headY - headH2 * 0.85);
            ctx.fillStyle = pal.s;
            ctx.fill();
        }

        const eyeY = headY - headH2 * (0.2 + bd.eyeY * 0.5);
        drawEye(ctx, 0, eyeY, S * 0.07, 'slit_v', pal, time, 0);
    }

    function drawSerpentoid(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;
        const segs = bd.segCount;
        const amp = bd.amplitude * S;
        const freq = bd.frequency;
        const wave = (t) => Math.sin(t * freq * 3 + time * boss.behavior.speed * 1.5) * amp;

        const segH = S * 0.8 / segs;
        for(let i = segs; i >= 0; i--) {
            const t = i / segs;
            const y = -S * 0.4 + i * segH;
            const wx = wave(t);
            const segW = S * (0.04 + (1 - t) * 0.10) * (1 - t * 0.3);

            ctx.beginPath();
            ctx.ellipse(wx, y, segW, segH * 0.6, 0, 0, Math.PI * 2);
            ctx.fillStyle = t < 0.15 ? pal.h : pal.p;
            ctx.fill();
            if(i % 2 === 0 && i > 0) {
                ctx.strokeStyle = pal.s + '88';
                ctx.lineWidth = S * 0.003;
                ctx.beginPath();
                ctx.moveTo(wx - segW, y - segH*0.4);
                ctx.lineTo(wx + segW, y + segH*0.4);
                ctx.stroke();
            }
        }

        const headWave = wave(0);
        const headY = -S * 0.42;
        const hoodW = S * bd.hoodFlare * 0.12;
        const hoodH = S * 0.08;
        ctx.beginPath();
        ctx.ellipse(headWave, headY - hoodH * 0.5, hoodW, hoodH, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.p;
        ctx.fill();

        const hW = S * 0.10, hH = S * 0.13;
        ctx.beginPath();
        ctx.ellipse(headWave, headY, hW, hH, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.h;
        ctx.fill();

        const fangLen = bd.fangLen * S;
        [-0.4, 0.4].forEach(fx => {
            ctx.beginPath();
            ctx.moveTo(headWave + fx * hW, headY + hH * 0.7);
            ctx.lineTo(headWave + fx * hW * 0.3, headY + hH * 0.7 + fangLen);
            ctx.lineWidth = S * 0.008;
            ctx.strokeStyle = '#ffffff';
            ctx.lineCap = 'round';
            ctx.stroke();
        });

        drawEye(ctx, headWave - hW * 0.45, headY - hH * 0.1, S * 0.035, 'slit_v', pal, time, 0);
        drawEye(ctx, headWave + hW * 0.45, headY - hH * 0.1, S * 0.035, 'slit_v', pal, time, Math.PI);
    }

    function drawArachnid(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;
        const bodyBob = Math.sin(time * 1.2) * S * 0.012;

        const abdY = S * 0.12 + bodyBob;
        ctx.beginPath();
        ctx.ellipse(0, abdY, S * 0.20, S * 0.24, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.p;
        ctx.fill();
        ctx.strokeStyle = pal.s;
        ctx.lineWidth = S * 0.01;
        ctx.stroke();
        for(let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(0, abdY - S*0.04 + i * S*0.07, S*(0.12 - i*0.02), S*0.02, 0, 0, Math.PI*2);
            ctx.fillStyle = pal.s + '66';
            ctx.fill();
        }

        const cephY = -S * 0.12 + bodyBob;
        ctx.beginPath();
        ctx.ellipse(0, cephY, S * 0.15, S * 0.18, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.h;
        ctx.fill();

        const legPairs = [[-0.25, 0.12], [-0.08, -0.02], [0.08, -0.02], [0.25, 0.08]];
        legPairs.forEach(([ly, oy], pi) => {
            [-1, 1].forEach(side => {
                const legBob = Math.sin(time * 3 + pi + (side > 0 ? 0 : Math.PI)) * S * 0.04;
                const x1 = side * S * 0.14;
                const y1 = cephY + ly * S;
                const x2 = side * S * (0.28 + pi * 0.04);
                const y2 = y1 - S * 0.12 + legBob;
                const x3 = side * S * (0.35 + pi * 0.06);
                const y3 = y2 + S * 0.22;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x3, y3);
                ctx.strokeStyle = pal.p;
                ctx.lineWidth = S * 0.022;
                ctx.lineJoin = 'round';
                ctx.stroke();
                ctx.strokeStyle = pal.s;
                ctx.lineWidth = S * 0.010;
                ctx.stroke();
            });
        });

        bd.eyePositions.forEach((ep, i) => {
            drawEye(ctx, ep.x * S * 1.2, cephY - S * 0.02 + ep.y * S, S * 0.022, 'small_round', pal, time, i * 0.7);
        });
    }

    function drawMedusoid(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;
        const float = Math.sin(time * boss.behavior.speed * 0.6) * S * 0.015;

        bd.tentacleAngles.forEach((baseAngle, i) => {
            const len = bd.tentacleLengths[i] * S;
            const waveA = Math.sin(time * 1.2 + i * 0.8) * 0.3;
            const startX = Math.cos(baseAngle) * S * 0.25;
            const startY = Math.sin(baseAngle) * S * 0.25 + float;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(
                startX + Math.cos(baseAngle + waveA) * len * 0.4,
                startY + Math.sin(baseAngle + waveA) * len * 0.4,
                startX + Math.cos(baseAngle + waveA * 0.5) * len * 0.75,
                startY + Math.sin(baseAngle + waveA * 0.5) * len * 0.75,
                startX + Math.cos(baseAngle) * len,
                startY + Math.sin(baseAngle) * len
            );
            ctx.strokeStyle = pal.p + 'bb';
            ctx.lineWidth = S * 0.022;
            ctx.lineCap = 'round';
            ctx.stroke();
        });

        const bellR = S * 0.30;
        const bellY = -S * 0.08 + float;
        ctx.beginPath();
        ctx.moveTo(-bellR, bellY);
        ctx.bezierCurveTo(-bellR * 1.1, bellY - bellR * 0.3, -bellR * 0.6, bellY - bellR * 0.9, 0, bellY - bellR * 0.95);
        ctx.bezierCurveTo( bellR * 0.6, bellY - bellR * 0.9,  bellR * 1.1, bellY - bellR * 0.3, bellR, bellY);
        ctx.bezierCurveTo( bellR * 0.5, bellY + bellR * 0.25, -bellR * 0.5, bellY + bellR * 0.25, -bellR, bellY);
        const grd = ctx.createRadialGradient(0, bellY - bellR * 0.4, 0, 0, bellY, bellR);
        grd.addColorStop(0, pal.h + 'cc');
        grd.addColorStop(0.5, pal.p + '99');
        grd.addColorStop(1, pal.s + '44');
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.strokeStyle = pal.p;
        ctx.lineWidth = S * 0.012;
        ctx.stroke();

        ctx.shadowBlur = S * 0.06;
        ctx.shadowColor = pal.p;
        for(let d = 0; d < bd.rimDots; d++) {
            const a = (d / bd.rimDots) * Math.PI;
            const rx = Math.cos(a) * bellR;
            const ry = bellY + Math.sin(a) * bellR * 0.25 - bellR * 0.1;
            const pulse = 0.5 + 0.5 * Math.sin(time * 3 + d * 0.5);
            ctx.beginPath();
            ctx.arc(rx, ry, S * 0.010 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = pal.h;
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        drawEye(ctx, 0, bellY - bellR * 0.38, S * 0.10, 'god_eye', pal, time, 0);
    }

    function drawDistributed(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;

        bd.connections.forEach(([i, j]) => {
            const a = bd.cores[i], b = bd.cores[j];
            const pulse = 0.3 + 0.4 * Math.sin(time * 2 + i);
            ctx.beginPath();
            ctx.moveTo(a.x * S, a.y * S);
            ctx.lineTo(b.x * S, b.y * S);
            ctx.strokeStyle = pal.p + Math.floor(pulse * 255).toString(16).padStart(2,'0');
            ctx.lineWidth = S * 0.007;
            ctx.stroke();
        });

        bd.cores.forEach((core, i) => {
            const cx2 = core.x * S;
            const cy2 = core.y * S;
            const r = core.r * S;
            const pulse = 0.85 + 0.15 * Math.sin(time * 2.5 + i * 1.3);
            ctx.beginPath();
            ctx.arc(cx2, cy2, r * pulse, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? pal.h : pal.p;
            ctx.shadowBlur = r * 2;
            ctx.shadowColor = pal.p;
            ctx.fill();
            ctx.shadowBlur = 0;
            if(core.hasEye) {
                drawEye(ctx, cx2, cy2, r * 0.55, 'sensor', pal, time, i * 0.9);
            }
        });
    }

    function drawEldritch(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;

        bd.voidTears.forEach(t => {
            const wiggle = Math.sin(time * 2 + t.x * 5) * S * 0.015;
            ctx.beginPath();
            ctx.moveTo(t.x * S - Math.cos(t.a) * t.len * S / 2, t.y * S - Math.sin(t.a) * t.len * S / 2 + wiggle);
            ctx.lineTo(t.x * S + Math.cos(t.a) * t.len * S / 2, t.y * S + Math.sin(t.a) * t.len * S / 2 + wiggle);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = S * 0.025;
            ctx.stroke();
            ctx.strokeStyle = pal.p + '99';
            ctx.lineWidth = S * 0.008;
            ctx.stroke();
        });

        bd.pieces.forEach((piece, i) => {
            const drift = piece.floating ? Math.sin(time * 0.8 + i) * S * 0.025 : 0;
            ctx.save();
            ctx.translate(piece.x * S, piece.y * S + drift);
            ctx.rotate(piece.rot + (piece.floating ? time * 0.3 : 0));
            ctx.beginPath();
            for(let s = 0; s < piece.sides; s++) {
                const a = (s / piece.sides) * Math.PI * 2;
                const r = piece.r * S * (0.8 + Math.sin(time + s) * 0.2);
                s === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
                        : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            ctx.fillStyle = pal.p + '88';
            ctx.strokeStyle = pal.h;
            ctx.lineWidth = S * 0.007;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        bd.eyePositions.forEach((ep, i) => {
            const drift = Math.sin(time * 0.7 + i * 1.3) * S * 0.015;
            drawEye(ctx, ep.x * S, ep.y * S + drift, ep.r * S, 'void_iris', pal, time, i * 1.1);
        });
    }

    function drawHiveOrganism(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;
        const bob = Math.sin(time * 1.5) * S * 0.01;

        ctx.beginPath();
        ctx.moveTo(-S * 0.015, S * 0.48 + bob);
        ctx.lineTo(0, S * 0.48 + bd.stingerLen * S + bob);
        ctx.lineTo(S * 0.015, S * 0.48 + bob);
        ctx.fillStyle = pal.s;
        ctx.fill();

        [[0.3, -0.05], [0.1, 0.2]].forEach(([ly, oy], pi) => {
            [-1, 1].forEach(side => {
                const legBob = Math.sin(time * 4 + pi + (side>0?0:Math.PI)) * S * 0.03;
                ctx.beginPath();
                ctx.moveTo(side * S * 0.13, ly * S + bob);
                ctx.lineTo(side * S * 0.30, ly * S + bob + oy * S + legBob);
                ctx.lineTo(side * S * 0.38, ly * S + bob + (oy + 0.15) * S);
                ctx.strokeStyle = pal.p;
                ctx.lineWidth = S * 0.025;
                ctx.lineJoin = 'round';
                ctx.stroke();
            });
        });

        const wingFlap = Math.sin(time * 8) * 0.1;
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.translate(side * S * 0.10, -S * 0.15 + bob);
            ctx.rotate(side * (0.3 + wingFlap));
            ctx.beginPath();
            ctx.ellipse(side * S * 0.18, -S * 0.05, S * 0.15, S * 0.06, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.p + '44';
            ctx.strokeStyle = pal.p + 'aa';
            ctx.lineWidth = S * 0.005;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        ctx.beginPath();
        ctx.ellipse(0, S * 0.25 + bob, S * 0.14, S * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.p;
        ctx.fill();
        for(let s = 0; s < 3; s++) {
            ctx.beginPath();
            ctx.ellipse(0, S * 0.15 + s * S * 0.10 + bob, S * 0.12, S * 0.018, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.s + '99';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.ellipse(0, -S * 0.10 + bob, S * 0.16, S * 0.20, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.h;
        ctx.fill();
        ctx.strokeStyle = pal.s + '66';
        ctx.lineWidth = S * 0.007;
        for(let hx = -1; hx <= 1; hx++) {
            for(let hy = -1; hy <= 1; hy++) {
                const hxp = hx * bd.hexSize * S * 1.7;
                const hyp = -S * 0.10 + bob + hy * bd.hexSize * S * 1.5 + (hx%2) * bd.hexSize * S * 0.75;
                ctx.beginPath();
                for(let s = 0; s < 6; s++) {
                    const a = s * Math.PI / 3;
                    const hr = bd.hexSize * S * 0.85;
                    s === 0 ? ctx.moveTo(hxp + Math.cos(a)*hr, hyp + Math.sin(a)*hr)
                            : ctx.lineTo(hxp + Math.cos(a)*hr, hyp + Math.sin(a)*hr);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }

        const antennaWig = Math.sin(time * 2) * 0.15;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(side * S * 0.06, -S * 0.28 + bob);
            ctx.quadraticCurveTo(
                side * S * (0.10 + antennaWig * side * 0.5), -S * (0.28 + bd.antennaLen * 0.5),
                side * S * 0.12, -S * (0.28 + bd.antennaLen)
            );
            ctx.strokeStyle = pal.p;
            ctx.lineWidth = S * 0.012;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(side * S * 0.12, -S * (0.28 + bd.antennaLen + 0.015), S * 0.015, 0, Math.PI * 2);
            ctx.fillStyle = pal.h;
            ctx.fill();
        });

        const headY = -S * 0.30 + bob;
        ctx.beginPath();
        ctx.ellipse(0, headY, S * 0.12, S * 0.10, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.h;
        ctx.fill();

        drawEye(ctx, -S * 0.07, headY, S * 0.038, 'compound', pal, time, 0);
        drawEye(ctx,  S * 0.07, headY, S * 0.038, 'compound', pal, time, Math.PI);
    }

    function drawVortical(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;
        const spinSpeed = boss.behavior.speed * 0.8;

        bd.debris.forEach(d => {
            const angle = d.angle + time * d.speed;
            const dist = d.dist * S * (0.8 + 0.2 * Math.sin(time + d.angle));
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist * 0.5;
            ctx.beginPath();
            ctx.arc(dx, dy, d.size * S, 0, Math.PI * 2);
            ctx.fillStyle = pal.p + 'bb';
            ctx.shadowBlur = d.size * S * 4;
            ctx.shadowColor = pal.p;
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        for(let r = bd.ringCount; r >= 0; r--) {
            const ringR = S * (0.08 + r * bd.ringGap);
            ctx.save();
            ctx.rotate(time * spinSpeed * (r % 2 === 0 ? 1 : -1));
            ctx.beginPath();
            ctx.ellipse(0, 0, ringR, ringR * 0.35, 0, 0, Math.PI * 2);
            ctx.strokeStyle = r === 0 ? pal.h : pal.p;
            ctx.lineWidth = S * (0.015 - r * 0.001);
            ctx.shadowBlur = S * 0.04;
            ctx.shadowColor = pal.p;
            ctx.stroke();
            for(let d2 = 0; d2 < 4; d2++) {
                const a = (d2 / 4) * Math.PI * 2;
                const px = Math.cos(a) * ringR, py = Math.sin(a) * ringR * 0.35;
                ctx.beginPath();
                ctx.arc(px, py, S * 0.012, 0, Math.PI * 2);
                ctx.fillStyle = pal.h;
                ctx.fill();
            }
            ctx.restore();
        }

        drawEye(ctx, 0, 0, S * 0.08, 'singularity', pal, time, 0);
    }

    function drawMycelial(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;
        const sway = Math.sin(time * 0.7) * S * 0.02;

        bd.roots.forEach(root => {
            const swayA = root.angle + Math.sin(time * 0.5) * 0.08;
            ctx.beginPath();
            ctx.moveTo(sway, S * 0.35);
            const ex = sway + Math.cos(swayA) * root.len * S;
            const ey = S * 0.35 + Math.sin(swayA) * root.len * S;
            ctx.quadraticCurveTo(sway + (ex - sway) * 0.5 + root.spread * S, (S * 0.35 + ey) / 2, ex, ey);
            ctx.strokeStyle = pal.s + '99';
            ctx.lineWidth = S * 0.015;
            ctx.lineCap = 'round';
            ctx.stroke();
        });

        ctx.beginPath();
        ctx.moveTo(sway, S * 0.35);
        ctx.quadraticCurveTo(sway * 0.5, 0, sway * 0.8, -S * 0.08);
        ctx.strokeStyle = pal.p;
        ctx.lineWidth = S * 0.06;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = pal.s + '88';
        ctx.lineWidth = S * 0.03;
        ctx.stroke();

        const capY = -S * 0.10;
        ctx.beginPath();
        ctx.moveTo(-S * 0.32 + sway * 0.5, capY);
        ctx.quadraticCurveTo(-S * 0.15 + sway, capY - S * 0.05, sway, capY - S * 0.25);
        ctx.quadraticCurveTo( S * 0.15 + sway, capY - S * 0.05, S * 0.32 + sway * 0.5, capY);
        ctx.bezierCurveTo( S * 0.20 + sway * 0.5, capY + S * 0.10, -S * 0.20 + sway * 0.5, capY + S * 0.10, -S * 0.32 + sway * 0.5, capY);
        const grd = ctx.createRadialGradient(sway, capY - S * 0.1, 0, sway, capY, S * 0.33);
        grd.addColorStop(0, pal.h);
        grd.addColorStop(0.5, pal.p);
        grd.addColorStop(1, pal.s);
        ctx.fillStyle = grd;
        ctx.fill();

        bd.spots.forEach(sp => {
            ctx.beginPath();
            ctx.arc(sp.x * S + sway, sp.y * S + capY - S * 0.08, sp.r * S, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff44';
            ctx.fill();
        });

        const sporeDrop = (time * 0.4) % 1;
        for(let s = 0; s < 5; s++) {
            const sporeT = ((s / 5) + sporeDrop) % 1;
            const sx = sway + (s - 2) * S * 0.08 + Math.sin(time + s) * S * 0.03;
            const sy = capY + sporeT * S * 0.5;
            ctx.beginPath();
            ctx.arc(sx, sy, S * 0.008, 0, Math.PI * 2);
            ctx.fillStyle = pal.h + Math.floor((1 - sporeT) * 255).toString(16).padStart(2,'00');
            ctx.fill();
        }

        const eyeYpos = S * 0.25 * (1 - bd.eyeY * 0.8) - S * 0.05;
        drawEye(ctx, sway + S * 0.04, eyeYpos, S * 0.038, 'spore', pal, time, 0);
        if(bd.eyeCount > 1)
            drawEye(ctx, sway - S * 0.04, eyeYpos - S * 0.06, S * 0.028, 'spore', pal, time, Math.PI);
    }

    function drawRecursive(ctx, boss, S, time) {
        const bd = boss.bodyData, pal = boss.palette;

        function drawFractalPoly(cx, cy, r, depth, maxDepth, rotOff) {
            if(depth > maxDepth || r < S * 0.015) return;
            const sides = bd.baseSides;
            const rot = time * bd.rotSpeed * (depth % 2 === 0 ? 1 : -1) + rotOff;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.beginPath();
            for(let s = 0; s < sides; s++) {
                const a = (s / sides) * Math.PI * 2;
                s === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
                        : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            const alpha = 0.7 - depth * 0.12;
            ctx.strokeStyle = pal.p + Math.floor(alpha * 255).toString(16).padStart(2,'0');
            ctx.fillStyle   = pal.s + Math.floor(alpha * 80).toString(16).padStart(2,'0');
            ctx.lineWidth   = S * 0.009 / (depth + 1);
            ctx.shadowBlur  = r * 0.5;
            ctx.shadowColor = pal.p;
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            for(let s = 0; s < sides; s++) {
                const a = (s / sides) * Math.PI * 2 + rot;
                const nx = cx + Math.cos(a) * r;
                const ny = cy + Math.sin(a) * r;
                drawFractalPoly(nx, ny, r * 0.42, depth + 1, maxDepth, rotOff + a);
            }
        }

        ctx.shadowBlur = 0;
        drawFractalPoly(0, 0, S * 0.32, 0, bd.fracDepth, 0);

        bd.eyePositions.forEach((ep, i) => {
            drawEye(ctx, ep.x * S, ep.y * S, ep.r * S, 'infinite', pal, time, i * 0.9);
        });
    }

    // =================================================================
    // ROTEADOR PRINCIPAL — chama o renderizador correto pelo arquétipo
    // =================================================================

    function drawBossAnatomy(ctx, boss, cx, cy, S, time) {
        if(!boss || !boss.bodyData) return;
        const { plan } = boss.bodyData;
        ctx.save();
        ctx.translate(cx, cy);
        switch(plan.archetype) {
            case 'colossus':      drawColossus(ctx, boss, S, time);      break;
            case 'serpentine':    drawSerpentoid(ctx, boss, S, time);    break;
            case 'arachnid':      drawArachnid(ctx, boss, S, time);      break;
            case 'medusoid':      drawMedusoid(ctx, boss, S, time);      break;
            case 'distributed':   drawDistributed(ctx, boss, S, time);   break;
            case 'eldritch':      drawEldritch(ctx, boss, S, time);      break;
            case 'hive_organism': drawHiveOrganism(ctx, boss, S, time);  break;
            case 'vortical':      drawVortical(ctx, boss, S, time);      break;
            case 'mycelial':      drawMycelial(ctx, boss, S, time);      break;
            case 'recursive':     drawRecursive(ctx, boss, S, time);     break;
            default:              drawEldritch(ctx, boss, S, time);      break;
        }
        ctx.restore();
    }
