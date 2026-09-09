let gameStarted = false;
let scene, camera, renderer, world, player;
let materials, highlightBox, handMesh, sun;
let selectedBlockType = 1;
let hotbarSlots = [1, 2, 3, 4, 5, 6, 7];
let dayTime = 0;

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}

function initGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8cb8ff);
    scene.fog = new THREE.FogExp2(0x8cb8ff, 0.025);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game-screen').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(20, 40, 20);
    scene.add(sun);

    materials = createBlockMaterials();
    world = new World(scene, materials);
    world.generate();

    player = new Player();

    let wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
    highlightBox = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x000000 }));
    highlightBox.visible = false;
    scene.add(highlightBox);

    let handGeo = new THREE.BoxGeometry(0.2, 0.2, 0.35);
    handMesh = new THREE.Mesh(handGeo, materials[1]);
    camera.add(handMesh);
    scene.add(camera);

    renderHotbar();
    initInventoryUI();
    initControls();

    window.addEventListener('resize', onWindowResize);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Отрисовка текстурных иконок блоков в UI
function drawBlockIcon(canvas, type) {
    let ctx = canvas.getContext('2d');
    let { canvas: texCanvas } = generateHDTexture(type, 'side');
    ctx.drawImage(texCanvas, 0, 0, 64, 64, 0, 0, canvas.width, canvas.height);
}

function renderHotbar() {
    const hb = document.getElementById('hotbar');
    hb.innerHTML = '';
    hotbarSlots.forEach((type) => {
        let slot = document.createElement('div');
        slot.className = `hotbar-slot ${type === selectedBlockType ? 'selected' : ''}`;
        slot.onclick = () => { selectedBlockType = type; renderHotbar(); };
        
        let cvs = document.createElement('canvas');
        cvs.className = 'slot-canvas'; cvs.width = 32; cvs.height = 32;
        drawBlockIcon(cvs, type);

        slot.appendChild(cvs);
        hb.appendChild(slot);
    });
}

function initInventoryUI() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let id in BLOCK_TYPES) {
        let type = parseInt(id);
        let slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.onclick = () => {
            selectedBlockType = type;
            hotbarSlots[0] = type;
            renderHotbar();
            document.getElementById('inventory-modal').style.display = 'none';
        };
        let cvs = document.createElement('canvas');
        cvs.className = 'slot-canvas'; cvs.width = 32; cvs.height = 32;
        drawBlockIcon(cvs, type);
        slot.appendChild(cvs);
        grid.appendChild(slot);
    }

    document.getElementById('inventory-btn').onclick = () => {
        document.getElementById('inventory-modal').style.display = 'flex';
    };
    document.getElementById('close-inventory-btn').onclick = () => {
        document.getElementById('inventory-modal').style.display = 'none';
    };
}

let moveState = { forward: false, back: false, left: false, right: false };
let touchLookId = null, lastTouchX = 0, lastTouchY = 0;
let touchStartTime = 0, touchTimer = null;

function initControls() {
    bindBtn('btn-up', 'forward');
    bindBtn('btn-down', 'back');
    bindBtn('btn-left', 'left');
    bindBtn('btn-right', 'right');

    function bindBtn(id, key) {
        const el = document.getElementById(id);
        el.addEventListener('touchstart', (e) => { e.preventDefault(); moveState[key] = true; });
        el.addEventListener('touchend', (e) => { e.preventDefault(); moveState[key] = false; });
    }

    document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.y <= 2.1) { player.vy = 0.12; sounds.playJump(); }
    });

    window.addEventListener('touchstart', (e) => {
        sounds.init();
        for (let i = 0; i < e.touches.length; i++) {
            let t = e.touches[i];
            if (t.clientX >= window.innerWidth / 3 && touchLookId === null && e.target.tagName !== 'BUTTON') {
                touchLookId = t.identifier;
                lastTouchX = t.clientX; lastTouchY = t.clientY;
                touchStartTime = Date.now();

                touchTimer = setTimeout(() => {
                    raycastAction(false);
                    touchTimer = null;
                }, 320);
            }
        }
    });

    window.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.touches.length; i++) {
            let t = e.touches[i];
            if (t.identifier === touchLookId) {
                let dx = t.clientX - lastTouchX;
                let dy = t.clientY - lastTouchY;
                
                if (Math.hypot(dx, dy) > 6 && touchTimer) {
                    clearTimeout(touchTimer); touchTimer = null;
                }

                player.rotationY -= dx * 0.004;
                player.rotationX -= dy * 0.004;
                player.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rotationX));
                lastTouchX = t.clientX; lastTouchY = t.clientY;
            }
        }
    });

    window.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchLookId) {
                touchLookId = null;
                if (touchTimer) {
                    clearTimeout(touchTimer); touchTimer = null;
                    if (Date.now() - touchStartTime < 320) raycastAction(true);
                }
            }
        }
    });
}

const raycaster = new THREE.Raycaster();
const centerVector = new THREE.Vector2(0, 0);

function raycastAction(isPlace) {
    raycaster.setFromCamera(centerVector, camera);
    let meshes = Object.values(world.blocks).map(b => b.mesh);
    let intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        let hit = intersects[0];
        let p = hit.point.clone();
        let normal = hit.face.normal.clone();

        handMesh.position.z = -0.3;
        setTimeout(() => handMesh.position.z = -0.5, 90);

        if (isPlace) {
            p.addScaledVector(normal, 0.5);
            world.createBlock(Math.round(p.x), Math.round(p.y), Math.round(p.z), selectedBlockType);
            sounds.playPlace();
        } else {
            p.addScaledVector(normal, -0.5);
            world.removeBlock(Math.round(p.x), Math.round(p.y), Math.round(p.z));
            sounds.playBreak();
        }
    }
}

function updateHighlight() {
    raycaster.setFromCamera(centerVector, camera);
    let meshes = Object.values(world.blocks).map(b => b.mesh);
    let intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        let hit = intersects[0];
        let p = hit.point.clone().addScaledVector(hit.face.normal, -0.5);
        highlightBox.position.set(Math.round(p.x), Math.round(p.y), Math.round(p.z));
        highlightBox.visible = true;
    } else {
        highlightBox.visible = false;
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (!gameStarted) return;

    // Вращение Солнца ("От себя": Смена дня и ночи)
    dayTime += 0.0005;
    sun.position.x = Math.cos(dayTime) * 40;
    sun.position.y = Math.sin(dayTime) * 40;

    player.update(moveState, camera, handMesh);
    world.updateParticles();
    updateHighlight();

    renderer.render(scene, camera);
}

document.getElementById('start-btn').onclick = () => {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    gameStarted = true;
    initGame();
};
