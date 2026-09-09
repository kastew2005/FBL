class Player {
    constructor() {
        this.x = 0; this.y = 6; this.z = 0;
        this.rotationX = 0; this.rotationY = 0;
        this.speed = 0.09;
        this.vy = 0;
        this.bobbingTimer = 0;
        this.isMoving = false;
    }

    update(moveState, camera, handMesh) {
        let forwardVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
        let sideVector = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
        let moveDir = new THREE.Vector3(0, 0, 0);

        if (moveState.forward) moveDir.add(forwardVector);
        if (moveState.back) moveDir.sub(forwardVector);
        if (moveState.right) moveDir.add(sideVector);
        if (moveState.left) moveDir.sub(sideVector);

        this.isMoving = moveDir.length() > 0;

        if (this.isMoving) {
            moveDir.normalize();
            this.x += moveDir.x * this.speed;
            this.z += moveDir.z * this.speed;

            // ЭФФЕКТ ПОКАЧИВАНИЯ КАМЕРЫ (Head Bobbing)
            this.bobbingTimer += 0.15;
            if (Math.sin(this.bobbingTimer) < -0.9) sounds.playStep();
        } else {
            this.bobbingTimer = 0;
        }

        // Физика гравитации
        this.vy -= 0.007;
        this.y += this.vy;
        if (this.y < 2) { this.y = 2; this.vy = 0; }

        // Позиция камеры с учетом эффекта ходьбы
        let bobY = Math.sin(this.bobbingTimer) * 0.05;
        let bobX = Math.cos(this.bobbingTimer * 0.5) * 0.03;

        camera.position.set(this.x + bobX, this.y + 1.6 + bobY, this.z);
        camera.quaternion.setFromEuler(new THREE.Euler(this.rotationX, this.rotationY, 0, 'YXZ'));

        // Анимация 3D руки/инструмента
        if (handMesh) {
            handMesh.position.set(0.35 + bobX, -0.35 + bobY, -0.5);
        }
    }
}
