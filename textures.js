const BLOCK_TYPES = {
    1: { name: 'Земля', color: '#5a3d28', accent: '#3d2717' },
    2: { name: 'Трава', color: '#3b7a20', accent: '#5ca338' },
    3: { name: 'Камень', color: '#686868', accent: '#484848' },
    4: { name: 'Дерево', color: '#5c4028', accent: '#3b2818' },
    5: { name: 'Листва', color: '#2d5a1e', accent: '#1f4014' },
    9: { name: 'Вода', color: '#1e68b5', accent: '#3b82d6', transparent: true },
    10: { name: 'Булыжник', color: '#444444', accent: '#222222' }
};

function generateUltraHDTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const config = BLOCK_TYPES[type] || BLOCK_TYPES[1];

    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, 128, 128);

    for (let x = 0; x < 128; x += 4) {
        for (let y = 0; y < 128; y += 4) {
            const rand = Math.random();
            if (rand > 0.6) {
                ctx.fillStyle = config.accent;
                ctx.globalAlpha = rand * 0.3;
                ctx.fillRect(x, y, 4, 4);
            }
        }
    }
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    return texture;
}

function createBlockMaterials() {
    let mats = {};
    for (let id in BLOCK_TYPES) {
        let type = parseInt(id);
        let isWater = (type === 9);
        mats[type] = new THREE.MeshStandardMaterial({
            map: generateUltraHDTexture(type),
            roughness: isWater ? 0.1 : 0.8,
            transparent: isWater,
            opacity: isWater ? 0.75 : 1.0
        });
    }
    return mats;
}
