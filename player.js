class Player {
    constructor(camera) {
        this.camera = camera;
        this.position = camera.position;
        this.velocity = new THREE.Vector3();
        this.width = 0.6;
        this.height = 1.8;
        this.heightOffset = 1.6;
        this.isGrounded = false;
        
        this.baseSpeed = 0.12;
        this.speed = this.baseSpeed;
        this.auraActive = false;
    }

    // Включение / Выключение Ауры Дракона
    toggleAura() {
        this.auraActive = !this.auraActive;
        const auraStatusUI = document.getElementById('aura-status');

        if (this.auraActive) {
            this.speed = this.baseSpeed * 1.85; // Бафф скорости
            if (auraStatusUI) auraStatusUI.style.display = 'block';
        } else {
            this.speed = this.baseSpeed;
            if (auraStatusUI) auraStatusUI.style.display = 'none';
        }
    }

    getAABB() {
        const half = this.width / 2;
        return {
            min: new THREE.Vector3(this.position.x - half, this.position.y - this.heightOffset, this.position.z - half),
            max: new THREE.Vector3(this.position.x + half, this.position.y - this.heightOffset + this.height, this.position.z + half)
        };
    }
}
