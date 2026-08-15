import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadKatana(scene, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const loader = new GLTFLoader();

    loader.load('frontend/models/Katana.glb', (gltf) => {
        const katanaModel = gltf.scene;

        katanaModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Применяем переданные из главного файла координаты, поворот и масштаб
        katanaModel.position.set(...position);
        katanaModel.rotation.set(...rotation);
        katanaModel.scale.set(...scale);

        scene.add(katanaModel);
        console.log("🗡️ Катана успешно загружена на сцену");
    }, undefined, (error) => {
        console.error("❌ Ошибка загрузки модели катаны:", error);
    });
}