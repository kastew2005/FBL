class VisualFX {
    constructor(scene) {
        this.scene = scene;
    }

    spawnParticles(x, y, z) {
        const pGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        for (let i = 0; i < 8; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(x, y, z);
            this.scene.add(p);
            setTimeout(() => this.scene.remove(p), 1000);
        }
    }
}
