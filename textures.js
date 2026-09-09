const BLOCK_TYPES = {
    1: { name: 'Земля', color: '#5a3d28', accent: '#3d2717' },
    2: { name: 'Трава', color: '#3b7a20', accent: '#5ca338' },
    3: { name: 'Камень', color: '#686868', accent: '#484848' },
    4: { name: 'Дерево', color: '#5c4028', accent: '#3b2818' },
    5: { name: 'Листва', color: '#2d5a1e', accent: '#1f4014' },
    6: { name: 'Верстак', color: '#a07040', accent: '#604020' },
    7: { name: 'Печка', color: '#4a4a4a', accent: '#ff5500' },
    8: { name: 'Песок', color: '#d8c27a', accent: '#b5a05b' },
    9: { name: 'Вода', color: '#1e68b5', accent: '#3b82d6', transparent: true },
    10: { name: 'Булыжник', color: '#444444', accent: '#222222' }
};

function generateUltraHDTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; 
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const config = BLOCK_TYPES[type] || BLOCK_TYPES[1];
    
    // Базовый цвет
    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, 128, 128);

    // Генерируем детальный узор/микрорельеф 128x128
    for (let x = 0; x < 128; x += 4) {
        for (let y = 0; y < 128; y += 4) {
            const rand = Math.random();
            if (rand > 0.6) {
                ctx.fillStyle = config.accent;
                ctx.globalAlpha = rand * 0.3;
                ctx.fillRect(x, y, 4, 4);
            } else if (rand < 0.2) {
                ctx.fillStyle = '#000000';
                ctx.globalAlpha = 0.15;
                ctx.fillRect(x, y, 4, 4);
            }
        }
    }
    ctx.globalAlpha = 1.0;

    // Рамка блока для имитации HD объёма
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    return { texture, canvas };
}

function createBlockMaterials() {
    let mats = {};
    for (let id in BLOCK_TYPES) {
        let type = parseInt(id);
        let isWater = (type === 9);
        mats[type] = new THREE.MeshStandardMaterial({
            map: generateUltraHDTexture(type).texture,
            roughness: isWater ? 0.1 : 0.8,
            metalness: isWater ? 0.1 : 0.1,
            transparent: isWater,
            opacity: isWater ? 0.75 : 1.0
        });
    }
    return mats;
}
