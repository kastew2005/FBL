const BLOCK_TYPES = {
    1: { name: 'Земля', color: '#866043' },
    2: { name: 'Трава', color: '#5b8731' },
    3: { name: 'Камень', color: '#7a7a7a' },
    4: { name: 'Дерево', color: '#543d2b' },
    5: { name: 'Листва', color: '#2e6f40' },
    6: { name: 'Кирпич', color: '#923c28' },
    7: { name: 'Доски', color: '#b38240' },
    8: { name: 'Песок', color: '#d6c278' }
};

function generateHDTexture(type, side = 'side') {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');

    let base = BLOCK_TYPES[type].color;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 32, 32);

    // Зернистый шум для детализации
    for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
            if (Math.random() > 0.6) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)';
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    // Текстура боковой стороны травы
    if (type === 2 && side === 'side') {
        ctx.fillStyle = '#866043';
        ctx.fillRect(0, 10, 32, 22);
        for (let x = 0; x < 32; x++) {
            if (Math.random() > 0.6) {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(x, 10, 1, 22);
            }
        }
        ctx.fillStyle = '#5b8731';
        ctx.fillRect(0, 0, 32, 10);
        // Неровный травяной край
        for (let x = 0; x < 32; x += 2) {
            let h = Math.floor(Math.random() * 4);
            ctx.fillRect(x, 10, 2, h);
        }
    }

    // Текстура среза дерева (Торцы)
    if (type === 4 && side === 'top') {
        ctx.fillStyle = '#8a6129';
        ctx.fillRect(0, 0, 32, 32);
        ctx.strokeStyle = '#543d2b';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, 24, 24);
        ctx.strokeRect(10, 10, 12, 12);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

// Создаем многосторонние материалы (Multi-material blocks)
function createBlockMaterials() {
    let mats = {};
    for (let id in BLOCK_TYPES) {
        let type = parseInt(id);
        if (type === 2) { // Трава
            let top = new THREE.MeshLambertMaterial({ map: generateHDTexture(2, 'top') });
            let side = new THREE.MeshLambertMaterial({ map: generateHDTexture(2, 'side') });
            let bottom = new THREE.MeshLambertMaterial({ map: generateHDTexture(1, 'top') });
            mats[type] = [side, side, top, bottom, side, side];
        } else if (type === 4) { // Дерево
            let side = new THREE.MeshLambertMaterial({ map: generateHDTexture(4, 'side') });
            let top = new THREE.MeshLambertMaterial({ map: generateHDTexture(4, 'top') });
            mats[type] = [side, side, top, top, side, side];
        } else {
            let mat = new THREE.MeshLambertMaterial({ map: generateHDTexture(type, 'side') });
            mats[type] = mat;
        }
    }
    return mats;
}
