// Игровые константы
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 400;
let worldWidth = 1600;
let worldHeight = 800;

// Состояние игры
let gameState = 'loading';
let player, zombies = [], bullets = [], pickups = [], particles = [];
let score = 0, kills = 0, gameTime = 0;
let keys = {};
let shooting = false;
let lastShotTime = 0;
let spawnTimer = 0;
let difficulty = 1;
let bestScore = localStorage.getItem('bestScore') || 0;
let camera = { x: 0, y: 0 };
let gameLevel = 1;

// Джойстик
let joystickActive = false;
let joystickDX = 0;
let joystickDY = 0;
let autoAimTarget = null;
let dashCooldown = 0;
let isDashing = false;
let dashTimer = 0;
let mouseX = 0;
let mouseY = 0;

// Класс игрока (компактный для альбомной ориентации)
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 22;
        this.height = 22;
        this.speed = 180;
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.maxArmor = 50;
        this.ammo = 12;
        this.maxAmmo = 12;
        this.energy = 0;
        this.angle = 0;
        this.alive = true;
        this.hitFlash = 0;
        this.walkAnimation = 0;
        this.moving = false;
        this.dashSpeed = 350;
    }

    update(dt) {
        if (!this.alive) return;
        
        let dx = 0, dy = 0;
        if (keys['w'] || keys['arrowup']) dy = -1;
        if (keys['s'] || keys['arrowdown']) dy = 1;
        if (keys['a'] || keys['arrowleft']) dx = -1;
        if (keys['d'] || keys['arrowright']) dx = 1;
        
        if (joystickActive) {
            dx = joystickDX;
            dy = joystickDY;
        }
        
        this.moving = (dx !== 0 || dy !== 0);
        
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
            this.walkAnimation += dt * 10;
        }
        
        if (isDashing && dashTimer > 0) {
            this.x += dx * this.dashSpeed * dt;
            this.y += dy * this.dashSpeed * dt;
            dashTimer -= dt;
        } else {
            this.x += dx * this.speed * dt;
            this.y += dy * this.speed * dt;
        }
        
        this.x = Math.max(this.width / 2, Math.min(worldWidth - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(worldHeight - this.height / 2, this.y));
        
        if (joystickActive) {
            autoAimTarget = this.findNearestZombie();
            if (autoAimTarget) {
                this.angle = Math.atan2(autoAimTarget.y - this.y, autoAimTarget.x - this.x);
            }
        } else if (mouseX && mouseY) {
            const screenX = mouseX + camera.x;
            const screenY = mouseY + camera.y;
            this.angle = Math.atan2(screenY - this.y, screenX - this.x);
            autoAimTarget = null;
        }
        
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (dashCooldown > 0) dashCooldown -= dt;
    }

    findNearestZombie() {
        let nearest = null;
        let minDist = Infinity;
        for (let zombie of zombies) {
            if (!zombie.alive) continue;
            const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
            if (dist < minDist && dist < 350) {
                minDist = dist;
                nearest = zombie;
            }
        }
        return nearest;
    }

    takeDamage(damage) {
        if (this.armor > 0) {
            const armorDamage = Math.min(this.armor, damage * 0.5);
            this.armor -= armorDamage;
            damage -= armorDamage;
        }
        this.health -= damage;
        this.hitFlash = 0.1;
        
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        showDamageIndicator();
        
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            gameOver();
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        
        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2, this.width / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ноги
        const legSwing = this.moving ? Math.sin(this.walkAnimation) * 3 : 0;
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(-5, this.height / 2 - 7 + legSwing, 4, 8);
        ctx.fillRect(1, this.height / 2 - 7 - legSwing, 4, 8);
        
        // Тело
        ctx.fillStyle = this.hitFlash > 0 ? '#ff4444' : '#5a8f5a';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Броня
        if (this.armor > 0) {
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(-this.width / 2 + 2, -this.height / 4, this.width - 4, this.height / 2);
        }
        
        // Голова
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(0, -this.height / 2 - 3, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Оружие
        ctx.save();
        ctx.rotate(this.angle);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(5, -1.5, 14, 3);
        ctx.restore();
        
        ctx.restore();
    }
}

// Класс зомби
class Zombie {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type || 'normal';
        this.alive = true;
        this.hitFlash = 0;
        this.walkAnimation = Math.random() * Math.PI * 2;
        
        switch(this.type) {
            case 'fast':
                this.speed = 130 + difficulty * 5;
                this.health = 30;
                this.damage = 5;
                this.color = '#ff9900';
                break;
            case 'tank':
                this.speed = 45 + difficulty * 2;
                this.health = 100;
                this.damage = 12;
                this.width = 28;
                this.height = 28;
                this.color = '#ff0000';
                break;
            case 'exploder':
                this.speed = 90 + difficulty * 3;
                this.health = 20;
                this.damage = 20;
                this.color = '#ffff00';
                this.explodeRadius = 45;
                break;
            default:
                this.speed = 75 + difficulty * 5;
                this.health = 35;
                this.damage = 7;
                this.color = '#66aa66';
        }
    }

    update(dt) {
        if (!this.alive) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            this.walkAnimation += dt * 5;
        }
        
        if (dist < (this.width + player.width) / 2) {
            if (this.type === 'exploder') {
                this.explode();
            } else {
                player.takeDamage(this.damage * dt * 2);
            }
        }
        
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }
    
    explode() {
        const dist = Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2);
        if (dist < this.explodeRadius) {
            player.takeDamage(this.damage);
        }
        spawnParticles(this.x, this.y, '#ffff00', 15);
        this.alive = false;
    }

    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2, this.width / 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, -this.height / 2 - 3, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-2, -this.height / 2 - 4, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -this.height / 2 - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Класс пули
class Bullet {
    constructor(x, y, angle, type = 'player') {
        this.x = x;
        this.y = y;
        this.speed = type === 'player' ? 450 : 180;
        this.damage = type === 'player' ? 25 : 8;
        this.radius = 3;
        this.alive = true;
        this.type = type;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.life = 1.5;
        this.color = type === 'player' ? '#ffff00' : '#00ff00';
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        
        if (this.life <= 0 || this.x < 0 || this.x > worldWidth || 
            this.y < 0 || this.y > worldHeight) {
            this.alive = false;
        }
        
        if (this.type === 'player') {
            for (let zombie of zombies) {
                if (!zombie.alive) continue;
                const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
                if (dist < (zombie.width + this.radius) / 2) {
                    zombie.health -= this.damage;
                    zombie.hitFlash = 0.1;
                    this.alive = false;
                    
                    if (zombie.health <= 0) {
                        zombie.alive = false;
                        kills++;
                        score += 10;
                        spawnParticles(zombie.x, zombie.y, zombie.color, 12);
                        
                        if (Math.random() < 0.3) {
                            pickups.push(new Pickup(zombie.x, zombie.y, 'energy'));
                        }
                    }
                    break;
                }
            }
        } else {
            const dist = Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2);
            if (dist < (player.width + this.radius) / 2) {
                player.takeDamage(this.damage);
                this.alive = false;
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Класс пикапа
class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 14;
        this.height = 14;
        this.alive = true;
        this.bob = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.bob += dt * 3;
        
        const dist = Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2);
        if (dist < (this.width + player.width) / 2) {
            switch(this.type) {
                case 'health':
                    player.health = Math.min(player.maxHealth, player.health + 30);
                    break;
                case 'ammo':
                    player.ammo = Math.min(player.maxAmmo, player.ammo + 6);
                    break;
                case 'armor':
                    player.armor = Math.min(player.maxArmor, player.armor + 25);
                    break;
                case 'energy':
                    player.energy += 10;
                    break;
            }
            this.alive = false;
            spawnParticles(this.x, this.y, '#ffffff', 6);
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        
        const bounceY = this.y + Math.sin(this.bob) * 3 - camera.y;
        const x = this.x - camera.x;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x, bounceY, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.save();
        ctx.translate(x, bounceY);
        
        switch(this.type) {
            case 'health':
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-7, -7, 14, 14);
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-3, -1, 7, 2);
                ctx.fillRect(-1, -3, 2, 7);
                break;
            case 'ammo':
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(-5, -3, 4, 7);
                ctx.fillRect(1, -3, 4, 7);
                break;
            case 'armor':
                ctx.fillStyle = '#666';
                ctx.fillRect(-7, -7, 14, 14);
                ctx.fillStyle = '#999';
                ctx.fillRect(-5, -5, 10, 10);
                break;
            case 'energy':
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.moveTo(0, -7);
                ctx.lineTo(3, -2);
                ctx.lineTo(7, -2);
                ctx.lineTo(0, 7);
                ctx.lineTo(-3, 2);
                ctx.lineTo(-7, 2);
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }
}

// Класс частиц
class Particle {
    constructor(x, y, color, count = 8) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                life: Math.random() * 0.4 + 0.3,
                maxLife: 0.7,
                color: color,
                radius: Math.random() * 2 + 1
            });
        }
        this.alive = true;
    }

    update(dt) {
        for (let p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);
        if (this.particles.length === 0) this.alive = false;
    }

    draw(ctx) {
        for (let p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// Инициализация
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const rect = container.getBoundingClientRect();
    
    CANVAS_WIDTH = rect.width;
    CANVAS_HEIGHT = rect.height;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Адаптация мира под альбомную ориентацию
    worldWidth = Math.max(CANVAS_WIDTH * 1.8, 1200);
    worldHeight = Math.max(CANVAS_HEIGHT * 1.8, 600);
    
    if (player) {
        camera.x = player.x - CANVAS_WIDTH / 2;
        camera.y = player.y - CANVAS_HEIGHT / 2;
    }
}

// Функции экранов
function showMainMenu() {
    gameState = 'menu';
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('controlsScreen').classList.add('hidden');
    document.getElementById('aboutScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('deathScreen').classList.add('hidden');
    
    document.getElementById('menuBestScore').textContent = bestScore;
}

function showControls() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('controlsScreen').classList.remove('hidden');
}

function showAbout() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('aboutScreen').classList.remove('hidden');
}

function startGame() {
    gameState = 'playing';
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('deathScreen').classList.add('hidden');
    
    resetGame();
}

function restartGame() {
    document.getElementById('deathScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    resetGame();
}

function gameOver() {
    gameState = 'dead';
    document.getElementById('finalKills').textContent = kills;
    document.getElementById('finalTime').textContent = Math.floor(gameTime) + 'с';
    document.getElementById('finalLevel').textContent = gameLevel;
    
    if (kills > bestScore) {
        bestScore = kills;
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('achievement').textContent = '🏆 НОВЫЙ РЕКОРД!';
    } else {
        document.getElementById('achievement').textContent = '';
    }
    
    document.getElementById('bestScore').textContent = bestScore;
    
    setTimeout(() => {
        document.getElementById('deathScreen').classList.remove('hidden');
    }, 1000);
}

function resetGame() {
    player = new Player(worldWidth / 2, worldHeight / 2);
    zombies = [];
    bullets = [];
    pickups = [];
    particles = [];
    score = 0;
    kills = 0;
    gameTime = 0;
    difficulty = 1;
    spawnTimer = 0;
    gameLevel = 1;
    dashCooldown = 0;
    isDashing = false;
    dashTimer = 0;
    
    camera.x = player.x - CANVAS_WIDTH / 2;
    camera.y = player.y - CANVAS_HEIGHT / 2;
    
    for (let i = 0; i < 5; i++) {
        spawnPickup();
    }
    
    updateHUD();
}

function spawnZombie() {
    let type = 'normal';
    const random = Math.random();
    
    if (gameTime > 30 && random < 0.1) {
        type = 'exploder';
    } else if (random < 0.5) {
        type = 'normal';
    } else if (random < 0.8) {
        type = 'fast';
    } else {
        type = 'tank';
    }
    
    let x, y;
    const side = Math.floor(Math.random() * 4);
    switch(side) {
        case 0: x = Math.random() * worldWidth; y = -20; break;
        case 1: x = Math.random() * worldWidth; y = worldHeight + 20; break;
        case 2: x = -20; y = Math.random() * worldHeight; break;
        case 3: x = worldWidth + 20; y = Math.random() * worldHeight; break;
    }
    
    zombies.push(new Zombie(x, y, type));
}

function spawnPickup() {
    const x = Math.random() * (worldWidth - 80) + 40;
    const y = Math.random() * (worldHeight - 80) + 40;
    
    let type;
    const random = Math.random();
    if (random < 0.3) type = 'health';
    else if (random < 0.5) type = 'ammo';
    else if (random < 0.7) type = 'armor';
    else type = 'energy';
    
    pickups.push(new Pickup(x, y, type));
}

function spawnParticles(x, y, color, count = 8) {
    particles.push(new Particle(x, y, color, count));
}

function showDamageIndicator() {
    const indicator = document.getElementById('damageIndicator');
    indicator.classList.remove('hidden');
    indicator.textContent = '💥';
    setTimeout(() => {
        indicator.classList.add('hidden');
    }, 400);
}

function shoot() {
    const now = Date.now();
    if (now - lastShotTime < 200) return;
    if (player.ammo <= 0) return;
    
    lastShotTime = now;
    player.ammo--;
    bullets.push(new Bullet(player.x, player.y, player.angle, 'player'));
    spawnParticles(player.x + Math.cos(player.angle) * 12, 
                    player.y + Math.sin(player.angle) * 12, 
                    '#ffff00', 3);
}

function dash() {
    if (dashCooldown > 0 || player.energy < 20) return;
    
    player.energy -= 20;
    dashCooldown = 1.5;
    isDashing = true;
    dashTimer = 0.15;
    
    spawnParticles(player.x, player.y, '#00ffff', 8);
    
    const indicator = document.getElementById('dashIndicator');
    indicator.classList.remove('hidden');
    
    setTimeout(() => {
        isDashing = false;
        indicator.classList.add('hidden');
    }, 150);
}

// Обработчики ввода
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' && gameState === 'playing') {
        dash();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left);
    mouseY = (e.clientY - rect.top);
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) shooting = true;
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) shooting = false;
});

// Мобильное управление
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');
const shootBtn = document.getElementById('shootBtn');
const dashBtn = document.getElementById('dashBtn');

joystickBase.addEventListener('touchstart', handleJoystickStart, { passive: false });
joystickBase.addEventListener('touchmove', handleJoystickMove, { passive: false });
joystickBase.addEventListener('touchend', handleJoystickEnd);

function handleJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
    handleJoystickMove(e);
}

function handleJoystickMove(e) {
    e.preventDefault();
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const touch = e.touches[0];
    
    let dx = (touch.clientX - centerX) / (rect.width / 2);
    let dy = (touch.clientY - centerY) / (rect.height / 2);
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
        dx /= dist;
        dy /= dist;
    }
    
    joystickDX = dx;
    joystickDY = dy;
    
    joystickKnob.style.transform = `translate(calc(-50% + ${dx * 25}px), calc(-50% + ${dy * 25}px))`;
}

function handleJoystickEnd(e) {
    joystickActive = false;
    joystickDX = 0;
    joystickDY = 0;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
}

shootBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    shooting = true;
});

shootBtn.addEventListener('touchend', (e) => {
    shooting = false;
});

dashBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dash();
});

// Игровой цикл
let lastTime = Date.now();

function gameLoop() {
    const now = Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    
    if (gameState === 'playing') {
        update(dt);
        updateCamera();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

function updateCamera() {
    const targetX = player.x - CANVAS_WIDTH / 2;
    const targetY = player.y - CANVAS_HEIGHT / 2;
    
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
    
    camera.x = Math.max(0, Math.min(worldWidth - CANVAS_WIDTH, camera.x));
    camera.y = Math.max(0, Math.min(worldHeight - CANVAS_HEIGHT, camera.y));
}

function update(dt) {
    gameTime += dt;
    
    const newLevel = Math.floor(gameTime / 30) + 1;
    if (newLevel > gameLevel) {
        gameLevel = newLevel;
        difficulty = 1 + gameTime / 30;
    }
    
    player.update(dt);
    
    if (shooting && player.alive) {
        shoot();
    }
    
    // Обновление индикатора автоприцеливания
    const autoAimIndicator = document.getElementById('autoAimIndicator');
    if (autoAimTarget && joystickActive) {
        autoAimIndicator.classList.remove('hidden');
        const screenX = autoAimTarget.x - camera.x;
        const screenY = autoAimTarget.y - camera.y;
        autoAimIndicator.style.left = screenX + 'px';
        autoAimIndicator.style.top = screenY + 'px';
    } else {
        autoAimIndicator.classList.add('hidden');
    }
    
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnZombie();
        spawnTimer = Math.max(0.3, 1.5 - difficulty * 0.1);
    }
    
    for (let zombie of zombies) {
        zombie.update(dt);
    }
    zombies = zombies.filter(z => z.alive);
    
    for (let bullet of bullets) {
        bullet.update(dt);
    }
    bullets = bullets.filter(b => b.alive);
    
    for (let pickup of pickups) {
        pickup.update(dt);
    }
    pickups = pickups.filter(p => p.alive);
    
    if (pickups.length < 4 && Math.random() < 0.01) {
        spawnPickup();
    }
    
    for (let particle of particles) {
        particle.update(dt);
    }
    particles = particles.filter(p => p.alive);
    
    updateHUD();
    updateMinimap();
}

function updateHUD() {
    document.getElementById('healthText').textContent = Math.floor(player.health);
    document.getElementById('armorText').textContent = Math.floor(player.armor);
    
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    
    const armorPercent = (player.armor / player.maxArmor) * 100;
    document.getElementById('armorFill').style.width = armorPercent + '%';
    
    document.getElementById('ammoCount').textContent = `${player.ammo}/${player.maxAmmo}`;
    document.getElementById('energyCount').textContent = player.energy;
    document.getElementById('killCount').textContent = kills;
    document.getElementById('timeCount').textContent = Math.floor(gameTime) + 'с';
    document.getElementById('levelCount').textContent = `Ур. ${gameLevel}`;
}

function updateMinimap() {
    const minimapCanvas = document.getElementById('minimapCanvas');
    if (!minimapCanvas) return;
    
    const minimapCtx = minimapCanvas.getContext('2d');
    const size = minimapCanvas.width;
    const scale = size / worldWidth;
    
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, size, size);
    
    // Игрок
    minimapCtx.fillStyle = '#00ff00';
    minimapCtx.fillRect(player.x * scale - 2, player.y * scale - 2, 4, 4);
    
    // Зомби
    minimapCtx.fillStyle = '#ff0000';
    for (let zombie of zombies) {
        if (zombie.alive) {
            minimapCtx.fillRect(zombie.x * scale - 1, zombie.y * scale - 1, 2, 2);
        }
    }
    
    // Пикапы
    minimapCtx.fillStyle = '#ffff00';
    for (let pickup of pickups) {
        if (pickup.alive) {
            minimapCtx.fillRect(pickup.x * scale - 1, pickup.y * scale - 1, 2, 2);
        }
    }
}

function drawGround(ctx) {
    // Основной пол
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#4a6a4a');
    gradient.addColorStop(1, '#3a5a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Дорожки
    ctx.strokeStyle = 'rgba(80, 110, 80, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    
    for (let y = 0; y < worldHeight; y += 100) {
        const screenY = y - camera.y;
        if (screenY > -15 && screenY < CANVAS_HEIGHT + 15) {
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(CANVAS_WIDTH, screenY);
            ctx.stroke();
        }
    }
    
    for (let x = 0; x < worldWidth; x += 130) {
        const screenX = x - camera.x;
        if (screenX > -15 && screenX < CANVAS_WIDTH + 15) {
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, CANVAS_HEIGHT);
            ctx.stroke();
        }
    }
    
    ctx.setLineDash([]);
}

function draw() {
    drawGround(ctx);
    
    if (gameState === 'playing' || gameState === 'dead') {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        
        for (let pickup of pickups) {
            pickup.draw(ctx);
        }
        
        for (let zombie of zombies) {
            zombie.draw(ctx);
        }
        
        for (let bullet of bullets) {
            bullet.draw(ctx);
        }
        
        player.draw(ctx);
        
        for (let particle of particles) {
            particle.draw(ctx);
        }
        
        ctx.restore();
    }
    
    // Виньетка
    const vignetteGradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
    );
    vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Инициализация
function init() {
    resizeCanvas();
    
    const minimapCanvas = document.getElementById('minimapCanvas');
    const minimapSize = Math.min(60, window.innerHeight * 0.15);
    minimapCanvas.width = minimapSize;
    minimapCanvas.height = minimapSize;
    
    gameState = 'loading';
    document.getElementById('loadingScreen').classList.remove('hidden');
    document.getElementById('mainMenu').classList.add('hidden');
    
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        showMainMenu();
    }, 1500);
}

// Обработчики изменения размера
window.addEventListener('resize', () => {
    resizeCanvas();
    if (player) {
        updateCamera();
    }
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        resizeCanvas();
        if (player) {
            updateCamera();
        }
    }, 300);
});

// Предотвращение скролла
document.addEventListener('touchmove', (e) => {
    if (gameState === 'playing') {
        e.preventDefault();
    }
}, { passive: false });

// Запуск
init();
gameLoop();