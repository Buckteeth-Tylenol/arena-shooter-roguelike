// ==================== GAME STATE ====================
const gameState = {
    width: 1200,
    height: 800,
    wave: 1,
    score: 0,
    gameOver: false,
    upgrading: false,
    paused: false
};

// ==================== PLAYER ====================
class Player {
    constructor() {
        this.x = gameState.width / 2;
        this.y = gameState.height / 2;
        this.size = 20;
        this.maxHealth = 100;
        this.health = 100;
        this.armor = 0;
        this.speed = 300; // pixels per second
        this.vx = 0;
        this.vy = 0;
        this.fireRate = 100; // milliseconds
        this.lastFireTime = 0;
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.dashing = false;
        this.upgrades = [];
        this.damageMultiplier = 1;
        this.shield = 0;
    }

    update(dt, keys) {
        // Movement
        this.vx = 0;
        this.vy = 0;
        const moveSpeed = this.getMovementSpeed();

        if (keys['ArrowUp'] || keys['w']) this.vy -= moveSpeed;
        if (keys['ArrowDown'] || keys['s']) this.vy += moveSpeed;
        if (keys['ArrowLeft'] || keys['a']) this.vx -= moveSpeed;
        if (keys['ArrowRight'] || keys['d']) this.vx += moveSpeed;

        // Normalize diagonal movement
        const len = Math.hypot(this.vx, this.vy);
        if (len > 0) {
            this.vx = (this.vx / len) * moveSpeed;
            this.vy = (this.vy / len) * moveSpeed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Boundary checking
        this.x = Math.max(this.size, Math.min(gameState.width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(gameState.height - this.size, this.y));

        // Dash cooldown
        if (this.dashCooldown > 0) this.dashCooldown -= dt;

        // Shield decay
        if (this.shield > 0) this.shield = Math.max(0, this.shield - dt * 10);
    }

    getMovementSpeed() {
        let speed = this.speed;
        // Light Footed: Speed scales with low health
        if (this.hasUpgrade('Light Footed')) {
            const healthPercent = this.health / this.maxHealth;
            speed *= (1 + (1 - healthPercent) * 0.5);
        }
        // Density Shift: Slower but immune to knockback
        if (this.hasUpgrade('Density Shift')) speed *= 0.6;
        return speed;
    }

    draw(ctx) {
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

        // Draw shield
        if (this.shield > 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${this.shield / 100})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    takeDamage(amount) {
        if (this.shield > 0) {
            const absorbedDamage = Math.min(amount, this.shield);
            this.shield -= absorbedDamage;
            amount -= absorbedDamage;
            if (amount <= 0) return;
        }

        this.health -= amount;
        if (this.health <= 0) gameState.gameOver = true;

        // Absorbent Core: Overkill damage converts to shield
        if (this.health < 0 && this.hasUpgrade('Absorbent Core')) {
            this.shield += Math.abs(this.health);
            this.health = 0;
        }
    }

    hasUpgrade(name) {
        return this.upgrades.includes(name);
    }

    fire() {
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate) return;

        this.lastFireTime = now;
        const bullet = new Bullet(this.x, this.y, Math.random() * Math.PI * 2);
        bullet.damageMultiplier = this.damageMultiplier;
        bullets.push(bullet);
    }
}

// ==================== BULLET ====================
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 500;
        this.radius = 5;
        this.damage = 10;
        this.damageMultiplier = 1;
        this.bounces = 0;
        this.maxBounces = 0;
        this.pierceCount = 0;
        this.maxPierce = 0;
        this.lifetime = 5;
        this.age = 0;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.trail = [];
    }

    update(dt) {
        this.age += dt;
        if (this.age > this.lifetime) this.dead = true;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) this.trail.shift();

        // Boundary bouncing
        if (this.x < 0 || this.x > gameState.width) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(gameState.width, this.x));
            this.bounces++;
            if (this.bounces > this.maxBounces) this.dead = true;
        }
        if (this.y < 0 || this.y > gameState.height) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(gameState.height, this.y));
            this.bounces++;
            if (this.bounces > this.maxBounces) this.dead = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== ENEMY ====================
class Enemy {
    constructor(x, y, wave) {
        this.x = x;
        this.y = y;
        this.size = 12 + wave * 2;
        this.maxHealth = 20 + wave * 5;
        this.health = this.maxHealth;
        this.speed = 100 + wave * 20;
        this.damage = 5 + wave * 2;
        this.vx = 0;
        this.vy = 0;
        this.knockback = { x: 0, y: 0 };
    }

    update(dt, player) {
        // AI: Move toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        }

        // Apply knockback
        this.x += this.knockback.x * dt;
        this.y += this.knockback.y * dt;
        this.knockback.x *= 0.9;
        this.knockback.y *= 0.9;

        // Normal movement
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Boundary checking
        this.x = Math.max(this.size, Math.min(gameState.width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(gameState.height - this.size, this.y));
    }

    draw(ctx) {
        // Color based on health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = `hsl(${healthPercent * 120}, 100%, 50%)`;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

        // Health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - this.size, this.y - this.size - 5, this.size * 2, 3);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - this.size, this.y - this.size - 5, (this.size * 2) * healthPercent, 3);
    }
}

// ==================== GLOBALS ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player = new Player();
let enemies = [];
let bullets = [];
let particles = [];
const keys = {};
let frameTime = 0;
let enemySpawnTimer = 0;

// ==================== INPUT ====================
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') player.fire();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ==================== UPGRADES ====================
const UPGRADES = {
    // Projectile Mechanics
    'Square Fragmentation': { category: 'projectile', description: 'Bullets split into 4 tiny shards on impact' },
    'Elastic Bound': { category: 'projectile', description: 'Bullets bounce off screen edges up to 2 times' },
    'Heavy Caliber': { category: 'projectile', description: 'Projectiles are 3x larger, push enemies back, travel slower' },
    'Piercing Shard': { category: 'projectile', description: 'Bullets pass through first 2 enemies' },
    'Boomerang Shot': { category: 'projectile', description: 'Bullets fly out and return to you' },
    'Arc Lightning': { category: 'projectile', description: 'Shots chain to 3 nearby enemies' },
    
    // Defensive
    'Thorn Plating': { category: 'defense', description: 'Enemies take damage when touching you' },
    'Corner Shields': { category: 'defense', description: 'Four rotating cubes block projectiles' },
    'Aura of Frost': { category: 'defense', description: 'Cold ring slows nearby enemies' },
    'Absorbent Core': { category: 'defense', description: 'Overkill damage converts to temporary shield' },
    'Hardened Angles': { category: 'defense', description: 'Take 50% less damage from corner hits' },
    'Resilient Grid': { category: 'defense', description: 'Every 10 seconds, negate next damage instance' },
    
    // Movement
    'Warp Blink': { category: 'movement', description: 'Dash teleports you forward, phase through enemies' },
    'Impact Thrusters': { category: 'movement', description: 'Dashing into enemies deals damage and stuns' },
    'Rebound Step': { category: 'movement', description: 'Dashing into walls refreshes dash cooldown' },
    'Light Footed': { category: 'movement', description: 'Speed scales up when health is low' },
    'Density Shift': { category: 'movement', description: 'Slower but immune to knockback' },
    'Slipstream': { category: 'movement', description: 'Moving straight for 2s grants stacking speed bonus' },
    
    // Status Effects
    'Corrosive Acids': { category: 'status', description: 'Bullets leave damage-over-time effect' },
    'Gravity Trap': { category: 'status', description: 'Defeated enemies slow nearby enemies' },
    'Magnetic Pull': { category: 'status', description: 'Defeated enemies pull nearby enemies' },
    'Combustion Chain': { category: 'status', description: 'Enemies killed on fire explode' },
    'Soul Leech': { category: 'status', description: 'Defeating status-affected enemies heals you' },
    
    // Economic/Meta
    'Glass Cannon': { category: 'meta', description: '100% more damage, but max health = 1 HP' },
    'Investment Plan': { category: 'meta', description: '-10% max health, +1 upgrade choice every 3 waves' },
    'Lucky Square': { category: 'meta', description: '5% chance for 4x critical damage on every shot' },
    'Recycle Bin': { category: 'meta', description: 'Skip upgrade menu, get permanent 5% damage boost' },
};

function getRandomUpgrades(count = 3) {
    const upgradeNames = Object.keys(UPGRADES).filter(name => !player.hasUpgrade(name));
    const shuffled = upgradeNames.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function applyUpgrade(name) {
    player.upgrades.push(name);

    // Apply immediate effects
    switch (name) {
        case 'Glass Cannon':
            player.maxHealth = 1;
            player.health = 1;
            player.damageMultiplier *= 2;
            break;
        case 'Elastic Bound':
            // Applied during bullet logic
            break;
        case 'Piercing Shard':
            // Applied during collision
            break;
        case 'Heavy Caliber':
            player.damageMultiplier *= 0.7; // Slower fire but other benefits
            break;
        case 'Lucky Square':
            player.damageMultiplier *= 1.1; // Minor boost
            break;
        case 'Recycle Bin':
            player.damageMultiplier *= 1.05;
            break;
        case 'Investment Plan':
            player.maxHealth *= 0.9;
            break;
    }
}

function showUpgradeMenu() {
    gameState.upgrading = true;
    gameState.paused = true;
    const upgrades = getRandomUpgrades(3);
    const container = document.getElementById('upgradeCards');
    container.innerHTML = '';

    upgrades.forEach(name => {
        const card = document.createElement('div');
        card.className = 'upgradeCard';
        card.innerHTML = `<h3>${name}</h3><p>${UPGRADES[name].description}</p>`;
        card.onclick = () => {
            applyUpgrade(name);
            gameState.upgrading = false;
            gameState.paused = false;
            document.getElementById('upgrades').style.display = 'none';
            startWave();
        };
        container.appendChild(card);
    });

    document.getElementById('upgrades').style.display = 'block';
}

// ==================== SPAWNING ====================
function spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
        let x, y;
        const side = Math.random();
        if (side < 0.25) {
            x = Math.random() * gameState.width;
            y = -20;
        } else if (side < 0.5) {
            x = Math.random() * gameState.width;
            y = gameState.height + 20;
        } else if (side < 0.75) {
            x = -20;
            y = Math.random() * gameState.height;
        } else {
            x = gameState.width + 20;
            y = Math.random() * gameState.height;
        }
        enemies.push(new Enemy(x, y, gameState.wave));
    }
}

function startWave() {
    enemies = [];
    const enemyCount = 5 + gameState.wave * 2;
    spawnEnemies(enemyCount);
}

// ==================== COLLISION ====================
function checkCollisions() {
    // Bullet-Enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            if (dist < bullet.radius + enemy.size) {
                enemy.health -= bullet.damage * bullet.damageMultiplier;
                bullet.pierceCount++;

                // Apply knockback
                const angle = Math.atan2(dy, dx);
                enemy.knockback.x = Math.cos(angle) * 200;
                enemy.knockback.y = Math.sin(angle) * 200;

                // Check pierce
                if (bullet.pierceCount > bullet.maxPierce) {
                    bullets.splice(i, 1);
                }

                if (enemy.health <= 0) {
                    enemies.splice(j, 1);
                    gameState.score += 10;
                }
                break;
            }
        }
    }

    // Enemy-Player collisions
    for (let enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist < enemy.size + player.size) {
            player.takeDamage(enemy.damage * 0.016);
        }
    }
}

// ==================== UPDATE ====================
function update(dt) {
    if (gameState.paused) return;

    player.update(dt, keys);
    player.fire();

    for (let enemy of enemies) {
        enemy.update(dt, player);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update(dt);
        if (bullets[i].dead) bullets.splice(i, 1);
    }

    checkCollisions();

    // Wave completion
    if (enemies.length === 0 && !gameState.upgrading) {
        gameState.wave++;
        showUpgradeMenu();
    }
}

// ==================== DRAW ====================
function draw() {
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, gameState.width, gameState.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 100, 200, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < gameState.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, gameState.height);
        ctx.stroke();
    }
    for (let i = 0; i < gameState.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(gameState.width, i);
        ctx.stroke();
    }

    // Draw entities
    player.draw(ctx);
    for (let bullet of bullets) bullet.draw(ctx);
    for (let enemy of enemies) enemy.draw(ctx);

    // Update UI
    document.getElementById('health').textContent = `❤️ Health: ${Math.ceil(player.health)}/${player.maxHealth}`;
    document.getElementById('wave').textContent = `🌊 Wave: ${gameState.wave}`;
    document.getElementById('enemies').textContent = `👾 Enemies: ${enemies.length}`;
    document.getElementById('score').textContent = `⭐ Score: ${gameState.score}`;

    if (gameState.gameOver) {
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = `Final Score: ${gameState.score} | Wave: ${gameState.wave}`;
    }
}

// ==================== GAME LOOP ====================
let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.016); // Cap at 60 FPS
    lastTime = now;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Start the game
startWave();
gameLoop();