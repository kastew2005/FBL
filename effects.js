class VisualFX {
    constructor(scene) {
        this.scene = scene;
    }

    // Частицы Ауры Дракона [F]
    spawnAuraParticles(playerPosition) {
        const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const pMat = new THREE.MeshBasicMaterial({ color: 0x8a2be2 });
        
        for (let i = 0; i < 2; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(
                playerPosition.x + (Math.random() - 0.5) * 1.4,
                playerPosition.y - 0.4 + Math.random(),
                playerPosition.z + (Math.random() - 0.5) * 1.4
            );
            this.scene.add(p);
            
            setTimeout(() => {
                this.scene.remove(p);
            }, 500);
        }
    }
}
