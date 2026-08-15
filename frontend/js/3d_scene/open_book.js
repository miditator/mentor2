import * as THREE from 'three';

export function createOpenBook() {
    const group = new THREE.Group();

    // Материалы
    const coverMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b5998, // Синяя обложка
        roughness: 0.5
    });

    const pagesMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5dc, // Бежевые страницы
        roughness: 0.9
    });

    // 1. Основа обложки (корешок и разворот)
    const coverGeo = new THREE.BoxGeometry(0.18, 0.008, 0.13);
    const cover = new THREE.Mesh(coverGeo, coverMaterial);
    cover.castShadow = true;
    cover.receiveShadow = true;
    group.add(cover);

    // 2. Левая страница (слегка наклонена)
    const leftPageGeo = new THREE.BoxGeometry(0.08, 0.006, 0.11);
    const leftPage = new THREE.Mesh(leftPageGeo, pagesMaterial);
    leftPage.position.set(-0.045, 0.006, 0);
    leftPage.rotation.z = -0.05; // Легкий наклон к центру
    leftPage.castShadow = true;
    leftPage.receiveShadow = true;
    group.add(leftPage);

    // 3. Правая страница (слегка наклонена в другую сторону)
    const rightPageGeo = new THREE.BoxGeometry(0.08, 0.006, 0.11);
    const rightPage = new THREE.Mesh(rightPageGeo, pagesMaterial);
    rightPage.position.set(0.045, 0.006, 0);
    rightPage.rotation.z = 0.05; // Легкий наклон к центру
    rightPage.castShadow = true;
    rightPage.receiveShadow = true;
    group.add(rightPage);

    return group;
}