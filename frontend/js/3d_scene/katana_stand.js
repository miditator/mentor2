import * as THREE from 'three';

export function createKatanaStand() {
    const standGroup = new THREE.Group();

    // Единый материал для всей стойки (темный матовый графит в тон мебели)
    const standMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.7,
        metalness: 0.2
    });

    // 1. Нижняя подставка (основание)
    const baseWidth = 0.35;
    const baseHeight = 0.04;
    const baseDepth = 0.35;

    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const base = new THREE.Mesh(baseGeometry, standMaterial);
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    standGroup.add(base);

    // Небольшие ножки-опоры под основанием
    const footGeo = new THREE.BoxGeometry(0.06, 0.015, 0.06);
    const footPositions = [
        [-baseWidth/2 + 0.05, baseHeight + 0.0075, -baseDepth/2 + 0.05],
        [ baseWidth/2 - 0.05, baseHeight + 0.0075, -baseDepth/2 + 0.05],
        [-baseWidth/2 + 0.05, baseHeight + 0.0075,  baseDepth/2 - 0.05],
        [ baseWidth/2 - 0.05, baseHeight + 0.0075,  baseDepth/2 - 0.05]
    ];
    // Сдвинем их чуть ниже базовой плоскости основания
    footPositions.forEach(pos => {
        const foot = new THREE.Mesh(footGeo, standMaterial);
        foot.position.set(pos[0], 0.0075, pos[2]);
        foot.castShadow = true;
        foot.receiveShadow = true;
        standGroup.add(foot);
    });


    // 2. Вертикальные стойки (опоры)
    const pillarHeight = 0.65;
    const pillarThickness = 0.04;
    const pillarGeo = new THREE.BoxGeometry(pillarThickness, pillarHeight, pillarThickness);

    // Левая стойка
    const leftPillar = new THREE.Mesh(pillarGeo, standMaterial);
    leftPillar.position.set(-0.1, baseHeight + (pillarHeight / 2), 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    standGroup.add(leftPillar);

    // Правая стойка
    const rightPillar = new THREE.Mesh(pillarGeo, standMaterial);
    rightPillar.position.set(0.1, baseHeight + (pillarHeight / 2), 0);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    standGroup.add(rightPillar);


    // 3. Верхняя удерживающая рамка (держатель для рукояти/гарды катаны)
    const topBoxGeo = new THREE.BoxGeometry(0.26, 0.05, 0.12);
    const topHolder = new THREE.Mesh(topBoxGeo, standMaterial);
    topHolder.position.set(0, baseHeight + pillarHeight - 0.02, 0);
    topHolder.castShadow = true;
    topHolder.receiveShadow = true;
    standGroup.add(topHolder);

    // Вырез посередине верхней рамки (чтобы катана вертикально проходила сквозь нее)
    const cutoutGeo = new THREE.BoxGeometry(0.06, 0.04, 0.08);
    // В Three.js для идеального выреза можно просто сделать этот элемент чуть темнее или пропустить,
    // либо оставить сплошным, так как гарда катаны всё равно накроет это место сверху.

    return standGroup;
}