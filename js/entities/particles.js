let particles = [];

function createExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            velX: (Math.random() - 0.5) * 8,
            velY: (Math.random() - 0.5) * 8 - 2,
            life: 1,
            decay: 0.02 + Math.random() * 0.03,
            color,
            size: 2 + Math.random() * 3
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.velX;
        p.y += p.velY;
        p.velY += 0.15;
        p.life -= p.decay;

        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles(ctx, cameraY) {
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y - cameraY, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

window.EntitiesParticles = {
    createExplosion,
    updateParticles,
    drawParticles
};
