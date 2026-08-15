import * as THREE from 'three';

export function createRoom(scene, textureLoader) {
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const roomMaterials = {
        'Темный графит': new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide }),
        'Светлый бетон': new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide }),
        'Чистый белый': new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide })
    };

    // 1. ПОЛ
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), roomMaterials['Темный графит']);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.5;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // 2. ПОТОЛОК
    const ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), roomMaterials['Чистый белый']);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = 3.5;
    ceilingMesh.receiveShadow = true;
    roomGroup.add(ceilingMesh);

    // 3. ЛЕВАЯ СТЕНА
    const leftWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), roomMaterials['Темный графит']);
    leftWallMesh.position.set(-2.3, 1.5, 0);
    leftWallMesh.rotation.y = Math.PI / 2;
    leftWallMesh.receiveShadow = true;
    roomGroup.add(leftWallMesh);

    // 4. ПРАВАЯ СТЕНА
    const rightWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), roomMaterials['Темный графит']);
    rightWallMesh.position.set(3, 1.5, 0);
    rightWallMesh.rotation.y = -Math.PI / 2;
    rightWallMesh.receiveShadow = true;
    roomGroup.add(rightWallMesh);

    // 5. ЗАДНЯЯ СТЕНА + ПОСТЕР
    const backWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), roomMaterials['Светлый бетон']);
    backWallMesh.position.set(0.3, 0.5, -2);
    backWallMesh.scale.set(2.3, 1.7, 1);
    backWallMesh.receiveShadow = true;
    roomGroup.add(backWallMesh);

    textureLoader.load('frontend/img/wall4.webp', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const wallPoster = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 2),
            new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
        );
        wallPoster.position.set(0, 0, 0.02);
        backWallMesh.add(wallPoster);
    });

    const beamGeometry = new THREE.BoxGeometry(4, 0.05, 0.05);
    const beamMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00aaff,
        emissiveIntensity: 2.0,
        roughness: 0.4,
        metalness: 0.2
    });

    const beam1 = new THREE.Mesh(beamGeometry, beamMaterial);
    beam1.position.set(-2.3, -0.5, -1);
    beam1.rotation.set(0, 1.6, -0);
    beam1.castShadow = true;
    beam1.receiveShadow = true;
    roomGroup.add(beam1);

    // 3. Балка №2
    const beam2 = new THREE.Mesh(beamGeometry, beamMaterial);
    beam2.position.set(1, -0.5, -2); // Изменили координату X
    beam2.castShadow = true;
    beam2.receiveShadow = true;
    roomGroup.add(beam2);

    // 4. Балка №3 (Сдвинута вправо)
    const beam3 = new THREE.Mesh(beamGeometry, beamMaterial);
    beam3.position.set(3, -0.51, -0.41); // Изменили координату X
    beam3.castShadow = true;
    beam3.receiveShadow = true;
    beam3.rotation.set(-3.14, 1.56, -3.14);
    roomGroup.add(beam3);







    return roomGroup;
}

