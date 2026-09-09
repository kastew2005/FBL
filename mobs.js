class Villager {
    constructor(scene, x, y, z) {
        this.group = new THREE.Group();
        
        // Тело
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        this.group.add(body);

        // Голова
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x966f43 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.45;
        this.group.add(head);

        this.group.position.set(x, y, z);
        scene.add(this.group);
    }

    update() {
        // Простой ИИ случайных покачиваний / ходьбы
        this.group.rotation.y += (Math.random() - 0.5) * 0.02;
    }
}
