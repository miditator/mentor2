import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadBed(scene, position = [-2, -0.5, -2], rotation = [0, 1.5, 0], scale = [2.3, 2.3, 2.3]) {
    const loader = new GLTFLoader();

    // 1. Создаем бим в его исходных мировых координатах
    const bedbeam4Geometry = new THREE.BoxGeometry(2, 0.02, 2);
    const bedbeam4Material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00aaff,
        emissiveIntensity: 2.0,
        roughness: 0.4,
        metalness: 0.2
    });
    const bedbeam4 = new THREE.Mesh(bedbeam4Geometry, bedbeam4Material);

    bedbeam4.position.set(-1.32, -0.5, -2.3);
    bedbeam4.rotation.set(0, -0.073, 0);
    bedbeam4.scale.set(0.75,1.2,0.9)
    bedbeam4.castShadow = true;
    bedbeam4.receiveShadow = true;
    scene.add(bedbeam4);

    // 2. Загружаем кровать и связываем её с бимом
    loader.load('frontend/models/bed.glb', (gltf) => {
        const bedModel = gltf.scene;

        bedModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.color.multiplyScalar(0.5);
            }
        });

        // Применяем позицию, поворот и масштаб, переданные из главного файла
        bedModel.position.set(...position);
        bedModel.rotation.set(...rotation);
        bedModel.scale.set(...scale);

        scene.add(bedModel);

        // Привязываем бим к кровати без потери его координат
        bedModel.attach(bedbeam4);

        console.log("🛏️ Кровать и подсветка успешно связаны!");
    }, undefined, (error) => {
        console.error("❌ Ошибка загрузки модели кровати:", error);
    });
}