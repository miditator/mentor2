import * as THREE from 'three';

export function createBedsideTable() {
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2b2b2b,
        roughness: 0.6
    });
    const frontMaterial = new THREE.MeshStandardMaterial({
        color: 0x363636,
        roughness: 0.5
    });
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Золотая ручка
        metalness: 0.8,
        roughness: 0.2
    });

    // 1. Компактный корпус тумбочки (высота уменьшена до 0.35, чтобы убрать пустоту)
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.35, 0.45);
    const body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.position.y = 0.175;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Фасад выдвижного ящика
    const drawerGeo = new THREE.BoxGeometry(0.44, 0.22, 0.02);
    const drawer = new THREE.Mesh(drawerGeo, frontMaterial);
    drawer.position.set(0, 0.175, 0.23);
    drawer.castShadow = true;
    group.add(drawer);

    // 3. Ручка ящика
    const handleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 16);
    handleGeo.rotateX(Math.PI / 2);
    const handle = new THREE.Mesh(handleGeo, handleMaterial);
    handle.position.set(0, 0.175, 0.245);
    group.add(handle);

    return group;
}