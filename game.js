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
        this.fireRate = 1000; // milliseconds
        this.lastFireTime = 0;
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.dashing = false;
        this.upgrades = [];
        this.damageMultiplier = 1;
        this.shield = 0;
        this.slipstreamTimer = 0;
        this.slipstreamBonus = 0;
        this.lastGridIndex = -1;
        this.resilientGridReady = true;
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

        // Slipstream: Moving straight for 2s grants stacking speed bonus
        if (this.hasUpgrade('Slipstream')) {
            const isMovingDiagonal = Math.abs(this.vx) > 0 && Math.abs(this.vy) > 0;
            if (!isMovingDiagonal && len > 0) {
                this.slipstreamTimer += dt;
                if (this.slipstreamTimer >= 2) {
                    this.slipstreamBonus = Math.min(1, this.slipstreamBonus + 0.1);
                    this.slipstreamTimer = 0;
                }
            } else {
                this.slipstreamTimer = 0;
                this.slipstreamBonus = Math.max(0, this.slipstreamBonus - dt * 0.5);
            }
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

        // Resilient Grid timer
        if (!this.resilientGridReady) {
            // Ready in 10 seconds
        }
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
        // Slipstream: Moving straight grants bonus
        if (this.hasUpgrade('Slipstream')) {
            speed *= (1 + this.slipstreamBonus * 0.5);
        }
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

        // Draw Aura of Frost
        if (this.hasUpgrade('Aura of Frost')) {
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    takeDamage(amount) {
        // Resilient Grid: Every 10 seconds, negate next damage instance
        if (this.hasUpgrade('Resilient Grid') && this.resilientGridReady) {
            this.resilientGridReady = false;
            // Set 10 second timer
            setTimeout(() => { this.resilientGridReady = true; }, 10000);
            return;
        }

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
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        const bullet = new Bullet(this.x, this.y, angle);
        bullet.damageMultiplier = this.damageMultiplier;

        // Heavy Caliber: Projectiles are 3x larger, push enemies back, travel slower
        if (this.hasUpgrade('Heavy Caliber')) {
            bullet.radius = 15;
            bullet.speed = 300;
            bullet.vx = Math.cos(angle) * bullet.speed;
            bullet.vy = Math.sin(angle) * bullet.speed;
            bullet.damage = 20;
        }

        // Elastic Bound: Bullets bounce off screen edges up to 2 times
        if (this.hasUpgrade('Elastic Bound')) {
            bullet.maxBounces = 2;
        }

        // Piercing Shard: Bullets pass through first 2 enemies
        if (this.hasUpgrade('Piercing Shard')) {
            bullet.maxPierce = 2;
        }

        // Boomerang Shot: Bullets fly out and return to you
        if (this.hasUpgrade('Boomerang Shot')) {
            bullet.boomerangActive = true;
        }

        // Lucky Square: 5% chance for 4x critical damage on every shot
        if (this.hasUpgrade('Lucky Square') && Math.random() < 0.05) {
            bullet.damage *= 4;
        }

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
        this.boomerangActive = false;
        this.boomerangReturning = false;
        this.boomerangTime = 0;
        this.startX = x;
        this.startY = y;
    }

    update(dt) {
        this.age += dt;
        if (this.age > this.lifetime) this.dead = true;

        // Boomerang Shot: Bullets fly out and return to you
        if (this.boomerangActive) {
            this.boomerangTime += dt;
            if (this.boomerangTime > 1 && !this.boomerangReturning) {
                this.boomerangReturning = true;
            }

            if (this.boomerangReturning) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 10) {
                    this.dead = true;
                    return;
                }
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;
            }
        }

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
        this.slowTimer = 0;
        this.slowAmount = 0;
        this.burnTimer = 0;
        this.burnDamageTimer = 0.5;
        this.statusEffects = [];
        this._isDead = false;
    }

    update(dt, player) {
        // AI: Move toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        let speed = this.speed;

        // Aura of Frost: Cold ring slows nearby enemies
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (player.hasUpgrade('Aura of Frost') && distToPlayer < 150) {
            speed *= 0.5;
        }

        // Gravity Trap: Defeated enemies slow nearby enemies
        for (let trap of gravityTraps) {
            const distToTrap = Math.hypot(trap.x - this.x, trap.y - this.y);
            if (distToTrap < 200) {
                speed *= 0.6;
            }
        }

        if (dist > 0) {
            this.vx = (dx / dist) * speed;
            this.vy = (dy / dist) * speed;
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

        // Burn damage
        if (this.statusEffects.includes('burning')) {
            this.burnDamageTimer -= dt;
            if (this.burnDamageTimer <= 0) {
                this.health -= 2;
                this.burnDamageTimer = 0.5;
                if (this.health <= 0) {
                    this.die();
                    return;
                }
            }
        }
    }

    draw(ctx) {
        // Color based on health
        const healthPercent = Math.max(0, Math.min(this.health, this.maxHealth)) / this.maxHealth;
        let hue = healthPercent * 120;
        
        // Burning
        if (this.statusEffects.includes('burning')) {
            hue = 0; // Red
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        } else {
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        }

        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

        // Health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - this.size, this.y - this.size - 5, this.size * 2, 3);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - this.size, this.y - this.size - 5, (this.size * 2) * healthPercent, 3);
    }

    // Centralized death handling
    die() {
        if (this._isDead) return;
        this._isDead = true;

        const wasStatusAffected = this.statusEffects.length > 0;

        // Square Fragmentation: Bullets split into 4 tiny shards on impact
        if (player.hasUpgrade('Square Fragmentation')) {
            for (let k = 0; k < 4; k++) {
                const shardAngle = (Math.PI * 2 / 4) * k;
                const shard = new Bullet(this.x, this.y, shardAngle);
                shard.speed = 300;
                shard.radius = 2;
                shard.damage = 3;
                shard.lifetime = 2;
                shard.vx = Math.cos(shardAngle) * shard.speed;
                shard.vy = Math.sin(shardAngle) * shard.speed;
                bullets.push(shard);
            }
        }

        // Gravity Trap: Defeated enemies slow nearby enemies
        if (player.hasUpgrade('Gravity Trap')) {
            gravityTraps.push({
                x: this.x,
                y: this.y,
                lifetime: 5,
                age: 0
            });
        }

        // Magnetic Pull: Defeated enemies pull nearby enemies
        if (player.hasUpgrade('Magnetic Pull')) {
            enemies.forEach(e => {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < 200 && e !== this) {
                    const angle = Math.atan2(this.y - e.y, this.x - e.x);
                    e.knockback.x += Math.cos(angle) * 300;
                    e.knockback.y += Math.sin(angle) * 300;
                }
            });
        }

        // Combustion Chain: Enemies killed on fire explode
        if (player.hasUpgrade('Combustion Chain') && this.statusEffects.includes('burning')) {
            enemies.forEach(e => {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < 150 && e !== this) {
                    e.health -= 10;
                    if (!e.statusEffects.includes('burning')) e.statusEffects.push('burning');
                }
            });
        }

        // Soul Leech: Defeating status-affected enemies heals you
        if (player.hasUpgrade('Soul Leech') && wasStatusAffected) {
            player.health = Math.min(player.maxHealth, player.health + 15);
        }

        // Remove from enemies array
        const idx = enemies.indexOf(this);
        if (idx !== -1) enemies.splice(idx, 1);

        gameState.score += 10;
    }
}

// ==================== GLOBALS ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player = new Player();
let enemies = [];
let bullets = [];
let particles = [];
let gravityTraps = [];
const keys = {};
let frameTime = 0;
let enemySpawnTimer = 0;
let mouseX = gameState.width / 2;
let mouseY = gameState.height / 2;

// ==================== INPUT ====================
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') player.fire();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
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
            // Applied during bullet creation
            break;
        case 'Piercing Shard':
            // Applied during bullet creation
            break;
        case 'Heavy Caliber':
            // Applied during bullet creation
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
        case 'Boomerang Shot':
            // Applied during firing
            break;
        case 'Arc Lightning':
            // Applied during collision
            break;
        case 'Thorn Plating':
            // Applied during enemy-player collision
            break;
        case 'Aura of Frost':
            // Applied during enemy update
            break;
        case 'Hardened Angles':
            // Applied during damage calculation
            break;
        case 'Corrosive Acids':
            // Applied during collision
            break;
        case 'Gravity Trap':
            // Applied on enemy death
            break;
        case 'Magnetic Pull':
            // Applied on enemy death
            break;
        case 'Combustion Chain':
            // Applied on enemy death with burning
            break;
        case 'Soul Leech':
            // Applied on enemy death
            break;
        case 'Warp Blink':
            // Implement later with dash key
            break;
        case 'Impact Thrusters':
            // Implement later with dash key
            break;
        case 'Rebound Step':
            // Implement later with dash key
            break;
        case 'Density Shift':
            // Applied in getMovementSpeed
            break;
        case 'Light Footed':
            // Applied in getMovementSpeed
            break;
        case 'Slipstream':
            // Applied in update and getMovementSpeed
            break;
        case 'Corner Shields':
            // Implement rotating shield cubes
            break;
        case 'Absorbent Core':
            // Applied in takeDamage
            break;
        case 'Resilient Grid':
            // Applied in takeDamage
            break;
        case 'Square Fragmentation':
            // Applied on enemy death
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
                
                // Heavy Caliber pushes back more
                let knockbackForce = 200;
                if (player.hasUpgrade('Heavy Caliber')) {
                    knockbackForce = 400;
                }
                
                enemy.knockback.x = Math.cos(angle) * knockbackForce;
                enemy.knockback.y = Math.sin(angle) * knockbackForce;

                // Corrosive Acids: Bullets leave damage-over-time effect
                if (player.hasUpgrade('Corrosive Acids')) {
                    if (!enemy.statusEffects.includes('corroded')) {
                        enemy.statusEffects.push('corroded');
                        enemy.corrosionDamageTimer = 0;
                    }
                }

                // Arc Lightning: Shots chain to 3 nearby enemies
                if (player.hasUpgrade('Arc Lightning')) {
                    let nearbyEnemies = enemies.filter(e => {
                        const d = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                        return d < 200 && e !== enemy;
                    }).slice(0, 3);

                    nearbyEnemies.forEach(nearbyEnemy => {
                        nearbyEnemy.health -= bullet.damage * bullet.damageMultiplier * 0.5;
                        const angle = Math.atan2(nearbyEnemy.y - enemy.y, nearbyEnemy.x - enemy.x);
                        nearbyEnemy.knockback.x = Math.cos(angle) * 150;
                        nearbyEnemy.knockback.y = Math.sin(angle) * 150;
                        // Check if Arc Lightning killed this enemy
                        if (nearbyEnemy.health <= 0) {
                            nearbyEnemy.die();
                        }
                    });
                }

                // Check pierce
                if (bullet.pierceCount > bullet.maxPierce) {
                    bullets.splice(i, 1);
                    break;
                }

                if (enemy.health <= 0) {
                    // Use centralized death handling
                    enemy.die();
                    break;
                }
            }
        }
    }

    // Enemy-Player collisions
    for (let enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist < enemy.size + player.size) {
            let damage = enemy.damage * 0.016;

            // Hardened Angles: Take 50% less damage from corner hits
            if (player.hasUpgrade('Hardened Angles')) {
                damage *= 0.5;
            }

            // Density Shift: Immune to knockback
            if (!player.hasUpgrade('Density Shift')) {
                // Take knockback
            }

            player.takeDamage(damage);

            // Thorn Plating: Enemies take damage when touching you
            if (player.hasUpgrade('Thorn Plating')) {
                enemy.health -= 2 * 0.016;
                // Check if Thorn Plating killed the enemy
                if (enemy.health <= 0) {
                    enemy.die();
                }
            }
        }
    }
}

// ==================== UPDATE ====================
function update(dt) {
    if (gameState.paused) return;

    player.update(dt, keys);
    
    // Fire every frame (rate controlled by player.fireRate)
    if (!gameState.paused) {
        player.fire();
    }

    // Iterate backwards so we can safely remove enemies from the array during updates
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update(dt, player);

        // Corrosive Acids damage
        if (enemy.statusEffects.includes('corroded')) {
            enemy.corrosionDamageTimer = (enemy.corrosionDamageTimer || 0) + dt;
            if (enemy.corrosionDamageTimer > 0.5) {
                enemy.health -= 3;
                enemy.corrosionDamageTimer = 0;
                if (enemy.health <= 0) {
                    enemy.die();
                    continue;
                }
            }
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update(dt);
        if (bullets[i].dead) bullets.splice(i, 1);
    }

    // Update gravity traps
    for (let i = gravityTraps.length - 1; i >= 0; i--) {
        gravityTraps[i].age += dt;
        if (gravityTraps[i].age > gravityTraps[i].lifetime) {
            gravityTraps.splice(i, 1);
        }
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

    // Draw gravity traps
    for (let trap of gravityTraps) {
        ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(trap.x, trap.y, 200, 0, Math.PI * 2);
        ctx.fill();
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
