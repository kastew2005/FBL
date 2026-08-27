// ==================== ИНИЦИАЛИЗАЦИЯ THREE.JS ====================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let world, weaponSystem, zombieSystem;
let gameRunning = false;
let lastTime = 0;
let waveTimer = 0;
const waveDuration = 30000; // 30 секунд на волну
const keys = {};
let isPointerLocked = false;

// ==================== КЛАСС МИРА ====================
class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map();
        this.buildings = [];
        this.obstacles = [];
        this.worldSize = 100;
        
        this.init();
    }
    
    init() {
        this.createGround();
        this.createBuildings();
        this.createObstacles();
        this.createLighting();
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Дороги
        const roadGeometry1 = new THREE.PlaneGeometry(this.worldSize, 2);
        const roadGeometry2 = new THREE.PlaneGeometry(2, this.worldSize);
        const roadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.5
        });
        
        const road1 = new THREE.Mesh(roadGeometry1, roadMaterial);
        road1.rotation.x = -Math.PI / 2;
        road1.position.set(0, 0.01, 0);
        road1.receiveShadow = true;
        this.scene.add(road1);
        
        const road2 = new THREE.Mesh(roadGeometry2, roadMaterial);
        road2.rotation.x = -Math.PI / 2;
        road2.position.set(0, 0.01, 0);
        road2.receiveShadow = true;
        this.scene.add(road2);
    }
    
    createBuildings() {
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            
            if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
            
            const width = 5 + Math.random() * 10;
            const height = 5 + Math.random() * 20;
            const depth = 5 + Math.random() * 10;
            
            this.createBuilding(x, z, width, height, depth);
        }
    }
    
    createBuilding(x, z, width, height, depth) {
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            roughness: 0.6
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        
        this.buildings.push({
            x, z, width, height, depth,
            mesh: building
        });
    }
    
    createObstacles() {
        for (let i = 0; i < 30; i++) {
            const x = (Math.random() - 0.5) * 90;
            const z = (Math.random() - 0.5) * 90;
            
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
            
            const type = Math.random();
            
            if (type < 0.4) {
                this.createCar(x, z);
            } else if (type < 0.7) {
                this.createContainer(x, z);
            } else {
                this.createBarricade(x, z);
            }
        }
    }
    
    createCar(x, z) {
        const carGroup = new THREE.Group();
        
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() * 0xffffff,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        carGroup.add(body);
        
        const roofGeometry = new THREE.BoxGeometry(2, 1, 1.8);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.1
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(-0.5, 1.8, 0);
        roof.castShadow = true;
        carGroup.add(roof);
        
        carGroup.position.set(x, 0, z);
        carGroup.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(carGroup);
        this.obstacles.push(carGroup);
    }
    
    createContainer(x, z) {
        const containerGeometry = new THREE.BoxGeometry(6, 3, 3);
        const containerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.7
        });
        const container = new THREE.Mesh(containerGeometry, containerMaterial);
        container.position.set(x, 1.5, z);
        container.castShadow = true;
        container.receiveShadow = true;
        container.rotation.y = Math.random() * Math.PI;
        this.scene.add(container);
        this.obstacles.push(container);
    }
    
    createBarricade(x, z) {
        const barricadeGroup = new THREE.Group();
        
        for (let i = 0; i < 3; i++) {
            const plankGeometry = new THREE.BoxGeometry(3, 0.2, 0.5);
            const plankMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.9
            });
            const plank = new THREE.Mesh(plankGeometry, plankMaterial);
            plank.position.y = i * 0.4;
            plank.castShadow = true;
            plank.receiveShadow = true;
            barricadeGroup.add(plank);
        }
        
        barricadeGroup.position.set(x, 0, z);
        barricadeGroup.rotation.y = Math.random() * Math.PI;
        this.scene.add(barricadeGroup);
        this.obstacles.push(barricadeGroup);
    }
    
    createLighting() {
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.015);
        
        const moonLight = new THREE.DirectionalLight(0x4444ff, 0.5);
        moonLight.position.set(50, 100, 50);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.left = -50;
        moonLight.shadow.camera.right = 50;
        moonLight.shadow.camera.top = 50;
        moonLight.shadow.camera.bottom = -50;
        this.scene.add(moonLight);
        
        this.scene.background = new THREE.Color(0x1a0000);
        
        const ambientLight = new THREE.AmbientLight(0x222222);
        this.scene.add(ambientLight);
    }
}

// ==================== КЛАСС ОРУЖИЯ ====================
class WeaponSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.currentWeapon = 'pistol';
        this.ammo = {
            pistol: { current: 12, reserve: 48, max: 12 },
            shotgun: { current: 6, reserve: 24, max: 6 },
            rifle: { current: 30, reserve: 90, max: 30 }
        };
        this.medkits = 3;
        this.reloading = false;
        this.lastShot = 0;
        
        this.weapons = {
            pistol: {
                damage: 25,
                fireRate: 500,
                reloadTime: 1000,
                spread: 0.02,
                range: 50
            },
            shotgun: {
                damage: 15,
                pellets: 8,
                fireRate: 1000,
                reloadTime: 2000,
                spread: 0.15,
                range: 30
            },
            rifle: {
                damage: 35,
                fireRate: 100,
                reloadTime: 1500,
                spread: 0.01,
                range: 70
            }
        };
    }
    
    shoot() {
        if (!gameRunning || this.reloading) return;
        
        const weapon = this.weapons[this.currentWeapon];
        const now = Date.now();
        
        if (now - this.lastShot < weapon.fireRate) return;
        
        if (this.ammo[this.currentWeapon].current <= 0) {
            this.reload();
            return;
        }
        
        this.lastShot = now;
        this.ammo[this.currentWeapon].current--;
        
        if (this.currentWeapon === 'shotgun') {
            for (let i = 0; i < weapon.pellets; i++) {
                this.fireRay(weapon);
            }
        } else {
            this.fireRay(weapon);
        }
        
        this.updateAmmoDisplay();
    }
    
    fireRay(weapon) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        raycaster.far = weapon.range;
        
        const spreadX = (Math.random() - 0.5) * weapon.spread;
        const spreadY = (Math.random() - 0.5) * weapon.spread;
        raycaster.ray.direction.x += spreadX;
        raycaster.ray.direction.y += spreadY;
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            const object = hit.object;
            
            if (object.userData.isZombie) {
                object.userData.health -= weapon.damage;
                
                if (object.userData.health <= 0) {
                    object.userData.isDead = true;
                }
            }
        }
    }
    
    reload() {
        if (this.reloading) return;
        
        const weapon = this.ammo[this.currentWeapon];
        if (weapon.current === weapon.max || weapon.reserve === 0) return;
        
        this.reloading = true;
        
        setTimeout(() => {
            const needed = weapon.max - weapon.current;
            const available = Math.min(needed, weapon.reserve);
            
            weapon.current += available;
            weapon.reserve -= available;
            this.reloading = false;
            this.updateAmmoDisplay();
        }, this.weapons[this.currentWeapon].reloadTime);
    }
    
    useMedkit() {
        if (this.medkits <= 0) return 0;
        
        this.medkits--;
        return 50;
    }
    
    switchWeapon(weaponName) {
        if (this.weapons[weaponName]) {
            this.currentWeapon = weaponName;
            this.updateAmmoDisplay();
        }
    }
    
    updateAmmoDisplay() {
        const weapon = this.ammo[this.currentWeapon];
        document.getElementById('ammo-text').textContent = `${weapon.current}/${weapon.reserve}`;
    }
}

// ==================== КЛАСС ЗОМБИ ====================
class ZombieSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.zombies = [];
        this.maxZombies = 10;
        this.spawnRate = 3000;
        this.wave = 1;
        this.lastSpawn = 0;
        
        this.spawnZombie();
    }
    
    update(deltaTime) {
        const now = Date.now();
        
        if (this.zombies.length < this.maxZombies && now - this.lastSpawn > this.spawnRate) {
            this.spawnZombie();
            this.lastSpawn = now;
        }
        
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            
            if (zombie.userData.isDead) {
                this.scene.remove(zombie);
                this.zombies.splice(i, 1);
                this.updateScore(10);
                continue;
            }
            
            const direction = new THREE.Vector3()
                .subVectors(this.player.position, zombie.position)
                .normalize();
            
            zombie.position.add(direction.multiplyScalar(zombie.userData.speed * deltaTime));
            zombie.position.y = 0;
            
            zombie.lookAt(this.player.position.x, 0, this.player.position.z);
            
            const distance = zombie.position.distanceTo(this.player.position);
            if (distance < 2) {
                this.attackPlayer(zombie);
            }
        }
    }
    
    spawnZombie() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        const x = this.player.position.x + Math.cos(angle) * distance;
        const z = this.player.position.z + Math.sin(angle) * distance;
        
        const zombie = this.createZombieMesh();
        zombie.position.set(x, 0, z);
        zombie.userData = {
            health: 50 + this.wave * 10,
            speed: 2 + this.wave * 0.2,
            damage: 10 + this.wave * 2,
            isZombie: true,
            isDead: false
        };
        
        this.scene.add(zombie);
        this.zombies.push(zombie);
    }
    
    createZombieMesh() {
        const zombieGroup = new THREE.Group();
        
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a4a,
            roughness: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        zombieGroup.add(body);
        
        const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            roughness: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        zombieGroup.add(head);
        
        return zombieGroup;
    }
    
    attackPlayer(zombie) {
        if (Date.now() - (zombie.userData.lastAttack || 0) > 1000) {
            zombie.userData.lastAttack = Date.now();
            this.player.takeDamage(zombie.userData.damage);
        }
    }
    
    updateScore(points) {
        const scoreElement = document.getElementById('score');
        const currentScore = parseInt(scoreElement.textContent);
        scoreElement.textContent = currentScore + points;
    }
    
    nextWave() {
        this.wave++;
        this.maxZombies += 5;
        this.spawnRate = Math.max(500, this.spawnRate - 200);
        
        document.getElementById('wave').textContent = this.wave;
    }
}

// ==================== ИГРОК ====================
const player = {
    position: new THREE.Vector3(0, 1.7, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    health: 100,
    stamina: 100,
    onGround: false,
    rotation: { x: 0, y: 0 },
    takeDamage: function(damage) {
        this.health = Math.max(0, this.health - damage);
        updateHealthDisplay();
        
        if (this.health <= 0) {
            this.die();
        }
    },
    die: function() {
        gameRunning = false;
        document.getElementById('death-screen').style.display = 'block';
        document.getElementById('final-score').textContent = document.getElementById('score').textContent;
        document.getElementById('final-wave').textContent = document.getElementById('wave').textContent;
        
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }
};

// ==================== ФУНКЦИИ ИНИЦИАЛИЗАЦИИ ====================
function initGame() {
    console.log('Инициализация игры...');
    
    // Очищаем сцену
    while(scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    
    // Сбрасываем позицию игрока
    player.position.set(0, 1.7, 0);
    player.velocity.set(0, 0, 0);
    player.health = 100;
    player.stamina = 100;
    player.rotation = { x: 0, y: 0 };
    
    // Создаем системы
    world = new World(scene);
    weaponSystem = new WeaponSystem(scene, camera);
    zombieSystem = new ZombieSystem(scene, player);
    
    camera.position.copy(player.position);
    gameRunning = true;
    waveTimer = 0;
    
    // Сбрасываем UI
    document.getElementById('score').textContent = '0';
    document.getElementById('wave').textContent = '1';
    updateHealthDisplay();
    updateStaminaDisplay();
    weaponSystem.updateAmmoDisplay();
    
    // Скрываем меню
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('death-screen').style.display = 'none';
    
    // Запускаем игровой цикл
    lastTime = performance.now();
    animate(lastTime);
    
    console.log('Игра запущена!');
}

// ==================== ФУНКЦИИ ОБНОВЛЕНИЯ ====================
function updateHealthDisplay() {
    const healthPercent = Math.max(0, player.health);
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = Math.round(healthPercent) + ' HP';
}

function updateStaminaDisplay() {
    const staminaPercent = Math.max(0, player.stamina);
    document.getElementById('stamina-fill').style.width = staminaPercent + '%';
    document.getElementById('stamina-text').textContent = Math.round(staminaPercent) + ' SP';
}

function updatePlayer(deltaTime) {
    if (!gameRunning) return;
    
    const forward = new THREE.Vector3(-Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y));
    const right = new THREE.Vector3(Math.cos(player.rotation.y), 0, -Math.sin(player.rotation.y));
    
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (keys['w'] || keys['arrowup']) moveDirection.add(forward);
    if (keys['s'] || keys['arrowdown']) moveDirection.sub(forward);
    if (keys['a'] || keys['arrowleft']) moveDirection.sub(right);
    if (keys['d'] || keys['arrowright']) moveDirection.add(right);
    
    let speed = 8;
    if (keys['shift'] && player.stamina > 0) {
        speed = 15;
        player.stamina -= 20 * deltaTime;
        updateStaminaDisplay();
    } else if (player.stamina < 100) {
        player.stamina += 10 * deltaTime;
        updateStaminaDisplay();
    }
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(speed * deltaTime);
        player.position.add(moveDirection);
    }
    
    player.velocity.y -= 20 * deltaTime;
    player.position.y += player.velocity.y * deltaTime;
    
    if (player.position.y <= 1.7) {
        player.position.y = 1.7;
        player.velocity.y = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }
    
    if ((keys[' '] || keys['space']) && player.onGround) {
        player.velocity.y = 8;
    }
    
    const worldBoundary = 45;
    player.position.x = Math.max(-worldBoundary, Math.min(worldBoundary, player.position.x));
    player.position.z = Math.max(-worldBoundary, Math.min(worldBoundary, player.position.z));
}

function updateCamera() {
    camera.position.copy(player.position);
    camera.rotation.set(player.rotation.x, player.rotation.y, 0);
}

// ==================== ИГРОВОЙ ЦИКЛ ====================
function animate(currentTime) {
    if (!gameRunning) return;
    
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    updatePlayer(deltaTime);
    if (zombieSystem) {
        zombieSystem.update(deltaTime);
    }
    updateCamera();
    
    waveTimer += deltaTime * 1000;
    if (waveTimer >= waveDuration && zombieSystem) {
        waveTimer = 0;
        zombieSystem.nextWave();
    }
    
    renderer.render(scene, camera);
    
    requestAnimationFrame(animate);
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (!gameRunning) return;
    
    if (e.key.toLowerCase() === 'r') {
        weaponSystem.reload();
    }
    
    if (e.key === '1') {
        weaponSystem.switchWeapon('pistol');
    }
    if (e.key === '2') {
        weaponSystem.switchWeapon('shotgun');
    }
    if (e.key === '3') {
        weaponSystem.switchWeapon('rifle');
    }
    if (e.key === '4') {
        const healAmount = weaponSystem.useMedkit();
        if (healAmount > 0) {
            player.health = Math.min(100, player.health + healAmount);
            updateHealthDisplay();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

document.addEventListener('mousedown', (e) => {
    if (!gameRunning) return;
    
    if (e.button === 0) {
        weaponSystem.shoot();
    }
});

document.addEventListener('mousemove', (e) => {
    if (!gameRunning || !isPointerLocked) return;
    
    player.rotation.y -= e.movementX * 0.002;
    player.rotation.x -= e.movementY * 0.002;
    
    player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rotation.x));
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
});

// Мобильное управление
if ('ontouchstart' in window) {
    document.getElementById('joystick-container').style.display = 'block';
    document.getElementById('action-buttons').style.display = 'flex';
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Делаем initGame глобальной
window.initGame = initGame;

console.log('Скрипт загружен успешно!');