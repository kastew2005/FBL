// Игровые константы
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

// Состояние игры
let gameState = 'menu';
let player, zombies = [], bullets = [], pickups = [], particles = [];
let score = 0, kills = 0, gameTime = 0;
let keys = {};
let shooting = false;
let lastShotTime = 0;
let spawnTimer = 0;
let difficulty = 1;
let bestScore = localStorage.getItem('bestScore') || 0;
let camera = { x: 0, y: 0 };
let worldWidth = 1600;
let worldHeight = 900;

// Джойстик
let joystickActive = false;
let joystickDX = 0;
let joystickDY = 0;
let autoAimTarget = null;

// Класс игрока с детальной графикой
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 150;
        this.health = 100;
        this.maxHealth = 100;
        this.ammo = 12;
        this.maxAmmo = 12;
        this.angle = 0;
        this.alive = true;
        this.hitFlash = 0;
        this.walkAnimation = 0;
        this.moving = false;
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
        
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;
        
        // Границы мира
        this.x = Math.max(this.width / 2, Math.min(worldWidth - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(worldHeight - this.height / 2, this.y));
        
        // Автоприцеливание
        if (joystickActive) {
            autoAimTarget = this.findNearestZombie();
            if (autoAimTarget) {
                this.angle = Math.atan2(autoAimTarget.y - this.y, autoAimTarget.x - this.x);
            }
        } else {
            const screenX = mouseX + camera.x;
            const screenY = mouseY + camera.y;
            this.angle = Math.atan2(screenY - this.y, screenX - this.x);
            autoAimTarget = null;
        }
        
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    findNearestZombie() {
        let nearest = null;
        let minDist = Infinity;
        for (let zombie of zombies) {
            if (!zombie.alive) continue;
            const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
            if (dist < minDist && dist < 300) {
                minDist = dist;
                nearest = zombie;
            }
        }
        return nearest;
    }

    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        
        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2, this.width / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ноги с анимацией ходьбы
        const legSwing = this.moving ? Math.sin(this.walkAnimation) * 5 : 0;
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(-8, this.height / 2 - 10 + legSwing, 7, 12);
        ctx.fillRect(1, this.height / 2 - 10 - legSwing, 7, 12);
        
        // Тело
        const bodyGradient = ctx.createLinearGradient(-this.width/2, -this.height/2, this.width/2, this.height/2);
        bodyGradient.addColorStop(0, this.hitFlash > 0 ? '#ff4444' : '#5a8f5a');
        bodyGradient.addColorStop(1, this.hitFlash > 0 ? '#cc0000' : '#3a6f3a');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Бронежилет
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-this.width / 2 + 3, -this.height / 4, this.width - 6, this.height / 2);
        
        // Голова
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(0, -this.height / 2 - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Волосы
        ctx.fillStyle = '#4a3728';
        ctx.beginPath();
        ctx.arc(0, -this.height / 2 - 7, 8, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Оружие
        ctx.save();
        ctx.rotate(this.angle);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(8, -2, 20, 4);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(24, -3, 6, 6);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(10, -4, 8, 2);
        ctx.restore();
        
        ctx.restore();
    }
}

// Класс зомби с детальной графикой
class Zombie {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 28;
        this.type = type || 'normal';
        this.alive = true;
        this.hitFlash = 0;
        this.walkAnimation = Math.random() * Math.PI * 2;
        
        switch(this.type) {
            case 'fast':
                this.speed = 120 + difficulty * 5;
                this.health = 40;
                this.damage = 8;
                this.color = '#ff9900';
                this.clothes = '#8b4513';
                break;
            case 'tank':
                this.speed = 40 + difficulty * 2;
                this.health = 150;
                this.damage = 20;
                this.width = 40;
                this.height = 40;
                this.color = '#ff0000';
                this.clothes = '#4a4a4a';
                break;
            default:
                this.speed = 70 + difficulty * 5;
                this.health = 50;
                this.damage = 10;
                this.color = '#66aa66';
                this.clothes = '#6b8e23';
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
            player.health -= this.damage * dt * 2;
            player.hitFlash = 0.1;
            if (player.health <= 0) {
                player.health = 0;
                player.alive = false;
                gameOver();
            }
        }
        
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        
        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2, this.width / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ноги с анимацией
        const legSwing = Math.sin(this.walkAnimation) * 4;
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(-8, this.height / 2 - 10 + legSwing, 6, 10);
        ctx.fillRect(2, this.height / 2 - 10 - legSwing, 6, 10);
        
        // Тело
        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.clothes;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Рваная одежда
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2 + 2, -this.height / 4, this.width - 4, this.height / 2);
        
        // Руки
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2 - 4, -this.height / 4 + legSwing, 4, 15);
        ctx.fillRect(this.width / 2, -this.height / 4 - legSwing, 4, 15);
        
        // Голова
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, -this.height / 2 - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Глаза (светящиеся)
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(-3, -this.height / 2 - 6, 2, 0, Math.PI * 2);
        ctx.arc(3, -this.height / 2 - 6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Рот
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(-4, -this.height / 2 - 2, 8, 2);
        
        ctx.restore();
    }
}

// Класс пули с эффектами
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speed = 500;
        this.damage = 25;
        this.radius = 4;
        this.alive = true;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.life = 2;
        this.trail = [];
    }

    update(dt) {
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 10) this.trail.shift();
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        
        if (this.life <= 0 || this.x < 0 || this.x > worldWidth || 
            this.y < 0 || this.y > worldHeight) {
            this.alive = false;
        }
        
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
                    spawnParticles(zombie.x, zombie.y, zombie.color, 20);
                }
                break;
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        
        // Траектория
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(this.trail[i].x - camera.x, this.trail[i].y - camera.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Пуля
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Свечение
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Класс пикапа с детальной графикой
class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 20;
        this.height = 20;
        this.alive = true;
        this.bob = Math.random() * Math.PI * 2;
        this.glow = 0;
    }

    update(dt) {
        this.bob += dt * 3;
        this.glow += dt * 2;
        
        const dist = Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2);
        if (dist < (this.width + player.width) / 2) {
            if (this.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + 30);
            } else if (this.type === 'ammo') {
                player.ammo = Math.min(player.maxAmmo, player.ammo + 6);
            }
            this.alive = false;
            spawnParticles(this.x, this.y, '#ffffff', 10);
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        
        const bounceY = this.y + Math.sin(this.bob) * 5 - camera.y;
        const x = this.x - camera.x;
        
        // Свечение
        const glowAlpha = 0.3 + Math.sin(this.glow) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(x, bounceY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.save();
        ctx.translate(x, bounceY);
        
        if (this.type === 'health') {
            // Аптечка
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-10, -10, 20, 20);
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.strokeRect(-10, -10, 20, 20);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-6, -2, 12, 4);
            ctx.fillRect(-2, -6, 4, 12);
        } else {
            // Патроны
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(-8, -6, 7, 12);
            ctx.fillRect(1, -6, 7, 12);
            ctx.fillStyle = '#cc8800';
            ctx.fillRect(-8, -10, 16, 4);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(-5, -8, 2, 8);
            ctx.fillRect(3, -8, 2, 8);
        }
        
        ctx.restore();
    }
}

// Класс частиц
class Particle {
    constructor(x, y, color, count = 10) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: Math.random() * 0.5 + 0.5,
                maxLife: 1,
                color: color,
                radius: Math.random() * 4 + 1,
                gravity: Math.random() * 100 + 50
            });
        }
        this.alive = true;
    }

    update(dt) {
        for (let p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.vy += p.gravity * dt;
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

// Функции окружения
function drawGround(ctx) {
    // Основной пол
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#5a7a5a');
    gradient.addColorStop(1, '#3a5a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Трава (детали)
    for (let x = 0; x < CANVAS_WIDTH; x += 20) {
        for (let y = 0; y < CANVAS_HEIGHT; y += 20) {
            if (Math.random() < 0.3) {
                ctx.fillStyle = '#4a6a4a';
                ctx.fillRect(x, y, 2, 5);
            }
        }
    }
    
    // Дорожки
    ctx.strokeStyle = '#6a8a6a';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Камни
    for (let i = 0; i < 10; i++) {
        const x = (i * 137) % CANVAS_WIDTH;
        const y = (i * 89) % CANVAS_HEIGHT;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Инициализация
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Функции экранов
function showMainMenu() {
    gameState = 'menu';
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('controlsScreen').classList.add('hidden');
    document.getElementById('aboutScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('deathScreen').classList.add('hidden');
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
    
    if (kills > bestScore) {
        bestScore = kills;
        localStorage.setItem('bestScore', bestScore);
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
    camera = { x: 0, y: 0 };
    
    for (let i = 0; i < 5; i++) {
        spawnPickup();
    }
}

function spawnZombie() {
    const type = Math.random();
    let zombieType = 'normal';
    if (type < 0.6) zombieType = 'normal';
    else if (type < 0.85) zombieType = 'fast';
    else zombieType = 'tank';
    
    let x, y;
    const side = Math.floor(Math.random() * 4);
    switch(side) {
        case 0: x = Math.random() * worldWidth; y = -20; break;
        case 1: x = Math.random() * worldWidth; y = worldHeight + 20; break;
        case 2: x = -20; y = Math.random() * worldHeight; break;
        case 3: x = worldWidth + 20; y = Math.random() * worldHeight; break;
    }
    
    zombies.push(new Zombie(x, y, zombieType));
}

function spawnPickup() {
    const x = Math.random() * (worldWidth - 40) + 20;
    const y = Math.random() * (worldHeight - 40) + 20;
    const type = Math.random() < 0.5 ? 'health' : 'ammo';
    pickups.push(new Pickup(x, y, type));
}

function spawnParticles(x, y, color, count = 10) {
    particles.push(new Particle(x, y, color, count));
}

function shoot() {
    const now = Date.now();
    if (now - lastShotTime < 300) return;
    if (player.ammo <= 0) return;
    
    lastShotTime = now;
    player.ammo--;
    bullets.push(new Bullet(player.x, player.y, player.angle));
    spawnParticles(player.x + Math.cos(player.angle) * 20, 
                    player.y + Math.sin(player.angle) * 20, 
                    '#ffff00', 5);
}

// Обработчики ввода
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
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

joystickBase.addEventListener('touchstart', handleJoystickStart);
joystickBase.addEventListener('touchmove', handleJoystickMove);
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
    
    joystickKnob.style.transform = `translate(calc(-50% + ${dx * 35}px), calc(-50% + ${dy * 35}px))`;
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
    // Центрирование камеры на игроке
    camera.x = player.x - CANVAS_WIDTH / 2;
    camera.y = player.y - CANVAS_HEIGHT / 2;
    
    // Ограничение камеры
    camera.x = Math.max(0, Math.min(worldWidth - CANVAS_WIDTH, camera.x));
    camera.y = Math.max(0, Math.min(worldHeight - CANVAS_HEIGHT, camera.y));
}

function update(dt) {
    gameTime += dt;
    difficulty = 1 + gameTime / 30;
    
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
        spawnTimer = Math.max(0.5, 2 - difficulty * 0.2);
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
    
    if (pickups.length < 3 && Math.random() < 0.02) {
        spawnPickup();
    }
    
    for (let particle of particles) {
        particle.update(dt);
    }
    particles = particles.filter(p => p.alive);
    
    updateHUD();
}

function updateHUD() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('ammoCount').textContent = `${player.ammo}/${player.maxAmmo}`;
    document.getElementById('killCount').textContent = kills;
    document.getElementById('timeCount').textContent = Math.floor(gameTime) + 'с';
}

function draw() {
    // Очистка
    drawGround(ctx);
    
    if (gameState === 'playing' || gameState === 'dead') {
        // Рисование в мировых координатах
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        
        // Пикапы
        for (let pickup of pickups) {
            pickup.draw(ctx);
        }
        
        // Зомби
        for (let zombie of zombies) {
            zombie.draw(ctx);
        }
        
        // Пули
        for (let bullet of bullets) {
            bullet.draw(ctx);
        }
        
        // Игрок
        player.draw(ctx);
        
        // Частицы
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
    vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Запуск игры
showMainMenu();
gameLoop();

// Предотвращение скролла на мобильных
document.addEventListener('touchmove', (e) => {
    if (gameState === 'playing') {
        e.preventDefault();
    }
}, { passive: false });