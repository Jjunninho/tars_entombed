// ARQUIVO: js/entities-system.js
// ✅ Este arquivo une todos os módulos individuais no objeto que o main.js espera.

window.EntitiesSystem = {
    // Gemas (Vêm do EntitiesGems em gems.js)
    generateGems: (chunk, platforms, rng) => EntitiesGems.generateGems(chunk, platforms, rng),
    updateGems: (gems, player, gameState) => EntitiesGems.updateGems(gems, player, gameState),
    drawGems: (ctx, gems, cameraY) => EntitiesGems.drawGems(ctx, gems, cameraY),

    // Inimigos (Vêm do EntitiesEnemies em enemies.js)
    generateEnemies: (chunk, platforms, rng) => EntitiesEnemies.generateEnemies(chunk, platforms, rng),
    updateEnemies: (enemies, player, gameState) => EntitiesEnemies.updateEnemies(enemies, player, gameState),
    drawEnemies: (ctx, enemies, cameraY) => EntitiesEnemies.drawEnemies(ctx, enemies, cameraY),

    // Power-ups (Vêm do EntitiesPowerUps em powerups.js)
    generatePowerUps: (chunk, platforms, rng) => EntitiesPowerUps.generatePowerUps(chunk, platforms, rng),
    updatePowerUps: (powerUps, player, gameState) => EntitiesPowerUps.updatePowerUps(powerUps, player, gameState),
    updateActivePowerUps: (gameState) => EntitiesPowerUps.updateActivePowerUps(gameState),
    drawPowerUps: (ctx, powerUps, cameraY) => EntitiesPowerUps.drawPowerUps(ctx, powerUps, cameraY),

    // Obstáculos (Vêm do EntitiesObstacles em obstacles.js)
    generateObstacles: (chunk, platforms, rng) => EntitiesObstacles.generateObstacles(chunk, platforms, rng),
    checkObstacleCollisions: (obstacles, player, gameState) => EntitiesObstacles.checkObstacleCollisions(obstacles, player, gameState),
    drawObstacles: (ctx, obstacles, cameraY) => EntitiesObstacles.drawObstacles(ctx, obstacles, cameraY),

    // Partículas (Vêm do EntitiesParticles em particles.js)
    createExplosion: (x, y, color, count) => EntitiesParticles.createExplosion(x, y, color, count),
    updateParticles: () => EntitiesParticles.updateParticles(),
    drawParticles: (ctx, cameraY) => EntitiesParticles.drawParticles(ctx, cameraY),

    // Decorações (Vêm do EntitiesDecorations em decorations.js)
    generateDecorations: (chunk, platforms, rng) => EntitiesDecorations.generateDecorations(chunk, platforms, rng),
    drawDecorations: (ctx, decorations, cameraY) => EntitiesDecorations.drawDecorations(ctx, decorations, cameraY)
};

console.log("✅ EntitiesSystem: Integração de módulos concluída!");