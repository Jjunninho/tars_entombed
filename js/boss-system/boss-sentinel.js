// ============================================================
// 🤖 BOSS 1: SENTINEL MK-I (Tutorial)
// Arquivo: boss-sentinel.js
// ============================================================

function drawSentinel(ctx, boss, screenY, now) {
    const cx = boss.x + boss.w / 2;
    const cy = screenY + boss.h / 2;
    const t  = now * 0.002;

    ctx.save();
    ctx.translate(cx, cy);

    // Flash de hit
    if (boss.state === 'HIT') {
        ctx.globalAlpha = 0.5 + Math.sin(now * 0.05) * 0.5;
    }

    // Corpo principal — retângulo metálico
    const grad = ctx.createLinearGradient(-boss.w / 2, 0, boss.w / 2, 0);
    grad.addColorStop(0, '#550000');
    grad.addColorStop(0.4, boss.accentColor);
    grad.addColorStop(1, '#330000');
    ctx.fillStyle = grad;
    ctx.fillRect(-boss.w / 2, -boss.h / 2, boss.w, boss.h);

    // Borda
    ctx.strokeStyle = boss.accentColor;
    ctx.lineWidth   = 2;
    ctx.strokeRect(-boss.w / 2, -boss.h / 2, boss.w, boss.h);

    // Olho central pulsante
    const eyeR = 8 + Math.sin(t * 3) * 2;
    ctx.fillStyle = boss.state === 'CHARGE' ? '#ffffff' : boss.accentColor;
    ctx.beginPath();
    ctx.arc(0, -4, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Pupila
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(boss.direction * 3, -4, eyeR * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Antenas giratórias
    ctx.save();
    ctx.rotate(boss.rotation);
    ctx.strokeStyle = boss.accentColor;
    ctx.lineWidth   = 2;
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 22, Math.sin(angle) * 22, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Pernas (dois blocos abaixo)
    ctx.fillStyle = '#444';
    ctx.fillRect(-boss.w / 2 + 6,  boss.h / 2,      14, 12);
    ctx.fillRect( boss.w / 2 - 20, boss.h / 2,      14, 12);

    ctx.globalAlpha = 1;
    ctx.restore();
}
