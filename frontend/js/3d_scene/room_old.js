import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadRoom(scene, onLoaded) {
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    // 🔥 Создаем общую группу, чтобы комната и постер двигались как единое целое
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // 🏠 ЗАГРУЖАЕМ КОМНАТУ-ФОН
    loader.load('frontend/models/RoomX.glb', function (roomGltf) {
        const roomModel = roomGltf.scene;

        roomModel.scale.set(0.5, 1.3, 1);
        roomModel.position.set(0.8, -0.49, 0.3);

        const roomMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        roomModel.traverse((child) => {
            if (child.isMesh) {
                child.material = roomMaterial;
                child.receiveShadow = true;
            }
        });

        roomGroup.add(roomModel); // Добавляем саму геометрию в группу
        console.log("🏠 3D-комната успешно загружена");

        // Отдаем ГОТОВУЮ ГРУППУ в контроллер
        if (onLoaded) onLoaded(roomGroup);
    }, undefined, function (error) {
        console.warn("⚠️ Не удалось загрузить комнату RoomX.glb:", error);
    });

    // 🖼️ ЗАГРУЖАЕМ ПОСТЕР НА ЗАДНЮЮ СТЕНКУ
    textureLoader.load('frontend/img/wall3.webp', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        const geometry = new THREE.PlaneGeometry(5.0, 3);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });

        const wallPoster = new THREE.Mesh(geometry, material);
        wallPoster.position.set(0.5, 0.5, -1.5);

        roomGroup.add(wallPoster); // Добавляем постер в ту же группу!
        console.log("🖼️ Картинка на задник успешно загружена");

    }, undefined, (err) => {
        console.error("❌ Ошибка загрузки картинки для задника:", err);
    });
}