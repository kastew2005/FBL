class World {
    constructor(scene, materials) {
        this.scene = scene;
        this.materials = materials;
        this.blocks = new Map();
        this.size = 40;
    }

    getBlockKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    getBlock(x, y, z) {
        return this.blocks.get(this.getBlockKey(x, y, z)) || 0;
    }

    setBlock(x, y, z, type) {
        const key = this.getBlockKey(x, y, z);
        if (type === 0) this.blocks.delete(key);
        else this.blocks.set(key, type);
    }

    generate() {
        for (let x = -this.size / 2; x < this.size / 2; x++) {
            for (let z = -this.size / 2; z < this.size / 2; z++) {
                let height = Math.floor(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3) + 4;
                for (let y = 0; y <= height; y++) {
                    let type = (y === height) ? 2 : (y > height - 3 ? 1 : 3);
                    this.setBlock(x, y, z, type);
                }
            }
        }
        this.buildMesh();
    }

    buildMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const counts = {};
        this.blocks.forEach((type) => counts[type] = (counts[type] || 0) + 1);

        for (let type in counts) {
            let mat = this.materials[type] || this.materials[1];
            let mesh = new THREE.InstancedMesh(geometry, mat, counts[type]);
            let idx = 0;
            const dummy = new THREE.Object3D();

            this.blocks.forEach((bType, key) => {
                if (bType === parseInt(type)) {
                    const [x, y, z] = key.split(',').map(Number);
                    dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
                    dummy.updateMatrix();
                    mesh.setMatrixAt(idx++, dummy.matrix);
                }
            });
            this.scene.add(mesh);
        }
    }
}
