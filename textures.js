const BLOCK_TYPES = {
    1: { name: 'Земля', color: '#7a5230' },
    2: { name: 'Трава', color: '#4c8a2a' },
    3: { name: 'Камень', color: '#6e6e6e' },
    4: { name: 'Дерево', color: '#4a3525' },
    5: { name: 'Листва', color: '#2b6632' },
    6: { name: 'Кирпич', color: '#8f3b2c' },
    7: { name: 'Доски', color: '#a07236' },
    8: { name: 'Песок', color: '#d1be73' }
};

// Генератор высокадетализированных 64x64 текстур
function generateHDTexture(type, side = 'side') {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');

    let base = BLOCK_TYPES[type].color;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 64, 64);

    // Детализированный шумовой слой 64x64
    for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 64; y++) {
            if (Math.random() > 0.5) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    // Текстура Травы (64x64)
    if (type === 2 && side === 'side') {
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(0, 18, 64, 46);
        ctx.fillStyle = '#4c8a2a';
        ctx.fillRect(0, 0, 64, 18);
        for (let x = 0; x < 64; x += 2) {
            let h = Math.floor(Math.random() * 8);
            ctx.fillRect(x, 18, 2, h);
        }
    }

    // Текстура Торца Дерева
    if (type === 4 && side === 'top') {
        ctx.fillStyle = '#825a33';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#4a3525';
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, 48, 48);
        ctx.strokeRect(20, 20, 24, 24);
    }

    // Текстура Кирпича
    if (type === 6) {
        ctx.strokeStyle = '#401911';
        ctx.lineWidth = 2;
        for (let y = 0; y < 64; y += 16) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
            let offset = (y / 16) % 2 === 0 ? 0 : 16;
            for (let x = offset; x < 64; x += 32) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke();
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return { texture, canvas };
}

function createBlockMaterials() {
    let mats = {};
    for (let id in BLOCK_TYPES) {
        let type = parseInt(id);
        if (type === 2) {
            let top = new THREE.MeshLambertMaterial({ map: generateHDTexture(2, 'top').texture });
            let side = new THREE.MeshLambertMaterial({ map: generateHDTexture(2, 'side').texture });
            let bottom = new THREE.MeshLambertMaterial({ map: generateHDTexture(1, 'top').texture });
            mats[type] = [side, side, top, bottom, side, side];
        } else if (type === 4) {
            let side = new THREE.MeshLambertMaterial({ map: generateHDTexture(4, 'side').texture });
            let top = new THREE.MeshLambertMaterial({ map: generateHDTexture(4, 'top').texture });
            mats[type] = [side, side, top, top, side, side];
        } else {
            let mat = new THREE.MeshLambertMaterial({ map: generateHDTexture(type, 'side').texture });
            mats[type] = mat;
        }
    }
    return mats;
}
