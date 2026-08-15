import * as THREE from 'three';
// 🔥 Импортируем геометрию со скругленными углами из аддонов Three.js
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createReadingChair() {
    const chairGroup = new THREE.Group();

    // 🎨 МАТЕРИАЛЫ
    // Основная ткань кресла (в тон стола 0x333842)
    const fabricMaterial = new THREE.MeshStandardMaterial({
        color: 0x333842,
        roughness: 0.9,
        metalness: 0.05
    });

    // Дерево для ножек (темно-серое/черное, как база лампы)
    const woodMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.1
    });

    // Подушка в той же гамме, но чуть темнее, чем кресло
    const pillowMaterial = new THREE.MeshStandardMaterial({
        color: 0x252a31,
        roughness: 1.0,
        metalness: 0.0
    });

    // 🪑 КОНСТРУКЦИЯ КРЕСЛА (С мягкими скругленными углами)
    // Параметры RoundedBoxGeometry: (ширина, высота, глубина, сегменты_скругления, радиус_угла)

    // 1. Основное сиденье (пышное и мягкое)
    const seatGeo = new RoundedBoxGeometry(0.8, 0.25, 0.7, 5, 0.06);
    const seat = new THREE.Mesh(seatGeo, fabricMaterial);
    seat.position.set(0, 0.35, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    chairGroup.add(seat);

    // 2. Высокая откинутая спинка
    const backGeo = new RoundedBoxGeometry(0.8, 0.9, 0.15, 5, 0.06);
    const back = new THREE.Mesh(backGeo, fabricMaterial);
    back.position.set(0, 0.85, -0.3);
    back.rotation.x = -0.15; // Слегка откинута назад для комфорта
    back.castShadow = true;
    back.receiveShadow = true;
    chairGroup.add(back);

    // 3. Боковые "ушки" на спинке
    const wingGeo = new RoundedBoxGeometry(0.12, 0.45, 0.25, 4, 0.04);

    const leftWing = new THREE.Mesh(wingGeo, fabricMaterial);
    leftWing.position.set(-0.35, 1.1, -0.2);
    leftWing.rotation.x = -0.15;
    leftWing.castShadow = true;
    chairGroup.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.set(0.35, 1.1, -0.2);
    chairGroup.add(rightWing);

    // 4. Мягкие подлокотники
    const armGeo = new RoundedBoxGeometry(0.15, 0.3, 0.7, 5, 0.06);

    const leftArm = new THREE.Mesh(armGeo, fabricMaterial);
    leftArm.position.set(-0.42, 0.55, 0.05);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    chairGroup.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.set(0.42, 0.55, 0.05);
    chairGroup.add(rightArm);

    // 5. Декоративная подушка под поясницу (максимально мягкая, как зефирка)
    const pillowGeo = new RoundedBoxGeometry(0.55, 0.25, 0.15, 6, 0.07);
    const pillow = new THREE.Mesh(pillowGeo, pillowMaterial);
    pillow.position.set(0, 0.52, -0.15);
    pillow.rotation.x = 0.1; // Слегка наклонена вперед
    pillow.castShadow = true;
    chairGroup.add(pillow);

    // 6. Деревянные ножки (слегка расставлены в стороны)
    const legGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.25, 12);

    const legPositions = [
        { x: -0.35, z: 0.25, rotX: -0.1, rotZ: 0.1 },  // Передняя левая
        { x: 0.35, z: 0.25, rotX: -0.1, rotZ: -0.1 },  // Передняя правая
        { x: -0.35, z: -0.25, rotX: 0.1, rotZ: 0.1 },  // Задняя левая
        { x: 0.35, z: -0.25, rotX: 0.1, rotZ: -0.1 }   // Задняя правая
    ];

    legPositions.forEach((pos) => {
        const leg = new THREE.Mesh(legGeo, woodMaterial);
        leg.position.set(pos.x, 0.125, pos.z);
        leg.rotation.set(pos.rotX, 0, pos.rotZ);
        leg.castShadow = true;
        chairGroup.add(leg);
    });

    // Сдвигаем всю группу так, чтобы точка привязки кресла (Y = 0) находилась ровно на уровне пола
    chairGroup.position.set(0, 0, 0);

    return chairGroup;
}