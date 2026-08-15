import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadCarpet(scene, onLoaded) {
    const gltfLoader = new GLTFLoader();

    gltfLoader.load('frontend/models/Carpet.glb', (gltf) => {
        // 🔥 Меняем название переменной на carpetModel для идеального порядка
        const carpetModel = gltf.scene;

        const carpetMaterial = new THREE.MeshStandardMaterial({
            color: 0x9e8d5a,
            roughness: 0.5,
            metalness: 0.05
        });

        const baseColor = new THREE.Color(0x9e8d5a);
        const hsl = {};
        baseColor.getHSL(hsl);

        hsl.s = 0.05;
        hsl.l = 0.1;

        carpetMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);

        carpetModel.traverse((child) => {
            if (child.isMesh) {
                child.material = carpetMaterial;
                child.receiveShadow = true;
            }
        });

        // Настраиваем позицию и масштаб нашей модели
        carpetModel.position.set(0.8, -0.5, 0);
        carpetModel.scale.set(0.7, 0.7, 0.7);

        scene.add(carpetModel);
        console.log("🧶 Ковер успешно добавлен в сцену");

        // Отдаем модель в контроллер!
        if (onLoaded) onLoaded(carpetModel);
    }, undefined, (error) => {
        console.error("❌ Ошибка загрузки ковра:", error);
    });
}