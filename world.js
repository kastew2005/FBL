class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map();
        this.buildings = [];
        this.obstacles = [];
        this.worldSize = 100;
        
        this.init();
    }
    
    init() {
        this.createGround();
        this.createBuildings();
        this.createObstacles();
        this.createLighting();
    }
    
    createGround() {
        // Земля
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Дороги
        this.createRoad(0, 0, this.worldSize, 0);
        this.createRoad(0, 0, 0, this.worldSize);
    }
    
    createRoad(x, z, width, depth) {
        if (width > 0) {
            const roadGeometry = new THREE.PlaneGeometry(width, 2);
            const roadMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                roughness: 0.5
            });
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.01, z);
            road.receiveShadow = true;
            this.scene.add(road);
        }
        
        if (depth > 0) {
            const roadGeometry = new THREE.PlaneGeometry(2, depth);
            const roadMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                roughness: 0.5
            });
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.01, z);
            road.receiveShadow = true;
            this.scene.add(road);
        }
    }
    
    createBuildings() {
        // Создаем здания
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            
            if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
            
            const width = 5 + Math.random() * 10;
            const height = 5 + Math.random() * 20;
            const depth = 5 + Math.random() * 10;
            
            this.createBuilding(x, z, width, height, depth);
        }
    }
    
    createBuilding(x, z, width, height, depth) {
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            roughness: 0.6
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        
        // Добавляем окна
        for (let i = 0; i < Math.floor(height / 2); i++) {
            for (let j = 0; j < Math.floor(width / 2); j++) {
                this.createWindow(x - width/2 + j * 2 + 1, i * 2 + 1, z - depth/2, width);
                this.createWindow(x - width/2 + j * 2 + 1, i * 2 + 1, z + depth/2, width);
            }
        }
        
        this.buildings.push({
            x, z, width, height, depth,
            mesh: building
        });
    }
    
    createWindow(x, y, z, rotation) {
        const windowGeometry = new THREE.PlaneGeometry(1, 1);
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00,
            emissive: 0x444400
        });
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        windowMesh.position.set(x, y, z);
        this.scene.add(windowMesh);
    }
    
    createObstacles() {
        // Создаем препятствия
        for (let i = 0; i < 30; i++) {
            const x = (Math.random() - 0.5) * 90;
            const z = (Math.random() - 0.5) * 90;
            
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
            
            const type = Math.random();
            
            if (type < 0.4) {
                // Машина
                this.createCar(x, z);
            } else if (type < 0.7) {
                // Контейнер
                this.createContainer(x, z);
            } else {
                // Баррикада
                this.createBarricade(x, z);
            }
        }
    }
    
    createCar(x, z) {
        const carGroup = new THREE.Group();
        
        // Кузов
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() * 0xffffff,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        carGroup.add(body);
        
        // Крыша
        const roofGeometry = new THREE.BoxGeometry(2, 1, 1.8);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.1
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(-0.5, 1.8, 0);
        roof.castShadow = true;
        carGroup.add(roof);
        
        carGroup.position.set(x, 0, z);
        carGroup.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(carGroup);
        this.obstacles.push(carGroup);
    }
    
    createContainer(x, z) {
        const containerGeometry = new THREE.BoxGeometry(6, 3, 3);
        const containerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.7
        });
        const container = new THREE.Mesh(containerGeometry, containerMaterial);
        container.position.set(x, 1.5, z);
        container.castShadow = true;
        container.receiveShadow = true;
        container.rotation.y = Math.random() * Math.PI;
        this.scene.add(container);
        this.obstacles.push(container);
    }
    
    createBarricade(x, z) {
        const barricadeGroup = new THREE.Group();
        
        // Баррикада из досок
        for (let i = 0; i < 3; i++) {
            const plankGeometry = new THREE.BoxGeometry(3, 0.2, 0.5);
            const plankMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.9
            });
            const plank = new THREE.Mesh(plankGeometry, plankMaterial);
            plank.position.y = i * 0.4;
            plank.castShadow = true;
            plank.receiveShadow = true;
            barricadeGroup.add(plank);
        }
        
        barricadeGroup.position.set(x, 0, z);
        barricadeGroup.rotation.y = Math.random() * Math.PI;
        this.scene.add(barricadeGroup);
        this.obstacles.push(barricadeGroup);
    }
    
    createLighting() {
        // Туман
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.015);
        
        // Луна
        const moonLight = new THREE.DirectionalLight(0x4444ff, 0.5);
        moonLight.position.set(50, 100, 50);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.left = -50;
        moonLight.shadow.camera.right = 50;
        moonLight.shadow.camera.top = 50;
        moonLight.shadow.camera.bottom = -50;
        this.scene.add(moonLight);
        
        // Красное небо
        this.scene.background = new THREE.Color(0x1a0000);
        
        // Атмосферный свет
        const ambientLight = new THREE.AmbientLight(0x222222);
        this.scene.add(ambientLight);
    }
}
