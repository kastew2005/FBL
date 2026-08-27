// Инициализация сцены
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

// Камера
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Рендерер
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// Игровые переменные
const blocks = new Map();
const blockSize = 1;
const worldSize = 32;
const groundLevel = 0;
const playerHeight = 1.7;
const playerSpeed = 8;
const jumpForce = 8;
const gravity = 20;

// Игрок
const player = {
    position: new THREE.Vector3(0, groundLevel + 5, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    onGround: false,
    rotation: { x: 0, y: 0 }
};

// Текущий выбранный блок
let selectedBlock = 'grass';

// Управление
const keys = {};

// Текстуры блоков
function createBlockTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
    
    // Добавляем текстуру
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    for(let i = 0; i < 64; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(64, i);
        ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
}

// Материалы блоков
const blockMaterials = {
    grass: new THREE.MeshStandardMaterial({ map: createBlockTexture('#4CAF50') }),
    dirt: new THREE.MeshStandardMaterial({ map: createBlockTexture('#795548') }),
    stone: new THREE.MeshStandardMaterial({ map: createBlockTexture('#9E9E9E') }),
    wood: new THREE.MeshStandardMaterial({ map: createBlockTexture('#8B4513') }),
    sand: new THREE.MeshStandardMaterial({ map: createBlockTexture('#FFE4B5') })
};

// Создание блока
function createBlock(x, y, z, type) {
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const block = new THREE.Mesh(geometry, blockMaterials[type]);
    block.position.set(x, y, z);
    block.castShadow = true;
    block.receiveShadow = true;
    block.userData = { type: type, position: { x, y, z } };
    scene.add(block);
    
    const key = `${x},${y},${z}`;
    blocks.set(key, block);
    return block;
}

// Генерация мира
function generateWorld() {
    for (let x = -worldSize/2; x < worldSize/2; x++) {
        for (let z = -worldSize/2; z < worldSize/2; z++) {
            const height = Math.floor(Math.random() * 3) + 1;
            
            for (let y = 0; y < height; y++) {
                let type = 'grass';
                if (y < height - 1) type = 'dirt';
                if (y > 2) type = 'stone';
                
                createBlock(x, y, z, type);
            }
            
            // Добавляем деревья
            if (Math.random() < 0.05) {
                createTree(x, height, z);
            }
        }
    }
}

// Создание дерева
function createTree(x, y, z) {
    const trunkHeight = Math.floor(Math.random() * 3) + 3;
    
    // Ствол
    for (let i = 0; i < trunkHeight; i++) {
        createBlock(x, y + i, z, 'wood');
    }
    
    // Листва
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            for (let dy = -2; dy <= 2; dy++) {
                if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 3) {
                    createBlock(x + dx, y + trunkHeight + dy, z + dz, 'grass');
                }
            }
        }
    }
}

// Raycasting для определения блока
function getTargetBlock() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = 10;
    
    const intersects = raycaster.intersectObjects(scene.children);
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const block = intersect.object;
        const point = intersect.point;
        
        // Определяем сторону клика
        const normal = intersect.face.normal;
        const position = block.position.clone();
        
        return {
            block: block,
            position: position,
            newPosition: position.clone().add(normal)
        };
    }
    
    return null;
}

// Обновление игрока
function updatePlayer(deltaTime) {
    // Движение
    const forward = new THREE.Vector3(-Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y));
    const right = new THREE.Vector3(Math.cos(player.rotation.y), 0, -Math.sin(player.rotation.y));
    
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (keys['w'] || keys['arrowup']) moveDirection.add(forward);
    if (keys['s'] || keys['arrowdown']) moveDirection.sub(forward);
    if (keys['a'] || keys['arrowleft']) moveDirection.sub(right);
    if (keys['d'] || keys['arrowright']) moveDirection.add(right);
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(playerSpeed * deltaTime);
        player.position.add(moveDirection);
    }
    
    // Гравитация
    player.velocity.y -= gravity * deltaTime;
    player.position.y += player.velocity.y * deltaTime;
    
    // Проверка коллизий
    player.onGround = false;
    const playerBlockY = Math.floor(player.position.y - playerHeight);
    const playerBlockX = Math.floor(player.position.x);
    const playerBlockZ = Math.floor(player.position.z);
    
    // Проверка блока под игроком
    for (let dy = 0; dy <= 3; dy++) {
        const key = `${playerBlockX},${playerBlockY - dy},${playerBlockZ}`;
        if (blocks.has(key)) {
            player.position.y = playerBlockY + dy + 1 + playerHeight;
            player.velocity.y = 0;
            player.onGround = true;
            break;
        }
    }
    
    // Прыжок
    if ((keys[' '] || keys['space']) && player.onGround) {
        player.velocity.y = jumpForce;
    }
}

// Обработка кликов
function handleClick(event) {
    const target = getTargetBlock();
    
    if (!target) return;
    
    if (event.button === 0) {
        // Левая кнопка - поставить блок
        const newPos = target.newPosition;
        const key = `${newPos.x},${newPos.y},${newPos.z}`;
        
        // Проверяем, не занято ли место
        if (!blocks.has(key)) {
            createBlock(newPos.x, newPos.y, newPos.z, selectedBlock);
        }
    } else if (event.button === 2) {
        // Правая кнопка - убрать блок
        const pos = target.position;
        const key = `${pos.x},${pos.y},${pos.z}`;
        
        if (blocks.has(key)) {
            scene.remove(blocks.get(key));
            blocks.delete(key);
        }
    }
}

// Обработчики событий
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

document.addEventListener('mousedown', handleClick);
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Мобильное управление
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }
});

document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        
        player.rotation.y -= deltaX * 0.005;
        player.rotation.x -= deltaY * 0.005;
        
        player.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.rotation.x));
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
});

document.addEventListener('touchend', (e) => {
    const touchDuration = Date.now() - touchStartTime;
    
    if (touchDuration < 200) {
        // Это был тап - ставим или убираем блок
        const target = getTargetBlock();
        if (target) {
            const newPos = target.newPosition;
            const key = `${newPos.x},${newPos.y},${newPos.z}`;
            
            if (!blocks.has(key)) {
                createBlock(newPos.x, newPos.y, newPos.z, selectedBlock);
            }
        }
    }
});

// Выбор блока в тулбаре
document.querySelectorAll('.tool').forEach(tool => {
    tool.addEventListener('click', () => {
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        tool.classList.add('active');
        selectedBlock = tool.dataset.block;
    });
});

// Игровой цикл
let lastTime = 0;

function animate(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    updatePlayer(deltaTime);
    
    // Обновление камеры
    camera.position.copy(player.position);
    camera.position.y += playerHeight;
    camera.rotation.set(player.rotation.x, player.rotation.y, 0);
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Запуск игры
generateWorld();
camera.position.set(player.position.x, player.position.y + playerHeight, player.position.z);
animate(0);
