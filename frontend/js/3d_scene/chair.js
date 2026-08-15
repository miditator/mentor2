import * as THREE from 'three';

export function createChair() {
    const chairGroup = new THREE.Group();

    // --- МАТЕРИАЛЫ ---
    const plasticMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.8,
        metalness: 0.1
    });

    // Ткань подушек в цвет темного покрывала с кровати
    const fabricMat = new THREE.MeshStandardMaterial({
        color: 0x333842,
        roughness: 0.9,
        metalness: 0.0
    });

    // --- ФУНКЦИЯ ДЛЯ СКРУГЛЕННЫХ ФОРМ ---
    function createRoundedBoxGeometry(width, height, depth, radius) {
        const shape = new THREE.Shape();
        const x = -width / 2;
        const y = -height / 2;

        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + height - radius);
        shape.quadraticCurveTo(x, y + height, x + radius, y + height);
        shape.lineTo(x + width - radius, y + height);
        shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
        shape.lineTo(x + width, y + radius);
        shape.quadraticCurveTo(x + width, y, x + width - radius, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo(x, y, x, y + radius);

        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 1,
            bevelSize: radius,
            bevelThickness: radius
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geom.center();
        return geom;
    }

    // --- КРЕСТОВИНА (Пятилучье) И КОЛЕСА ---
    const starGroup = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.04, 0.03, 0.25);
    const wheelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;

        const leg = new THREE.Mesh(legGeo, plasticMat);
        leg.position.set(Math.sin(angle) * 0.12, 0.045, Math.cos(angle) * 0.12);
        leg.rotation.y = angle;
        leg.castShadow = true;
        leg.receiveShadow = true;
        starGroup.add(leg);

        const wheel = new THREE.Mesh(wheelGeo, plasticMat);
        wheel.position.set(Math.sin(angle) * 0.22, 0.03, Math.cos(angle) * 0.22);
        wheel.rotation.y = angle;
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        starGroup.add(wheel);
    }
    chairGroup.add(starGroup);

    // --- ЦЕНТРАЛЬНАЯ КОЛОННА (Газлифт) ---
    const columnGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 16);
    const column = new THREE.Mesh(columnGeo, plasticMat);
    column.position.y = 0.21;
    column.castShadow = true;
    column.receiveShadow = true;
    chairGroup.add(column);

    // --- СИДЕНЬЕ ---
    // Пластиковая основа сиденья (теперь тоже скругленная)
    const seatBaseGeo = createRoundedBoxGeometry(0.45, 0.03, 0.45, 0.025);
    const seatBase = new THREE.Mesh(seatBaseGeo, plasticMat);
    seatBase.position.y = 0.375;
    seatBase.castShadow = true;
    seatBase.receiveShadow = true;
    chairGroup.add(seatBase);

    // Мягкая тканевая подушка сиденья
    const cushionGeo = createRoundedBoxGeometry(0.42, 0.05, 0.42, 0.02);
    const cushion = new THREE.Mesh(cushionGeo, fabricMat);
    cushion.position.y = 0.415;
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    chairGroup.add(cushion);

    // --- СПИНКА ---
    // Опора спинки (хребет)
    const spineGeo = new THREE.BoxGeometry(0.06, 0.3, 0.03);
    const spine = new THREE.Mesh(spineGeo, plasticMat);
    spine.position.set(0, 0.5, -0.2);
    spine.rotation.x = -0.1;
    spine.castShadow = true;
    spine.receiveShadow = true;
    chairGroup.add(spine);

    // Пластиковая основа спинки (теперь тоже скругленная)
    const backBaseGeo = createRoundedBoxGeometry(0.41, 0.36, 0.025, 0.025);
    const backBase = new THREE.Mesh(backBaseGeo, plasticMat);
    backBase.position.set(0, 0.72, -0.23);
    backBase.rotation.x = -0.1;
    backBase.castShadow = true;
    backBase.receiveShadow = true;
    chairGroup.add(backBase);

    // Мягкая тканевая подушка спинки
    const backCushionGeo = createRoundedBoxGeometry(0.38, 0.33, 0.03, 0.02);
    const backCushion = new THREE.Mesh(backCushionGeo, fabricMat);
    backCushion.position.set(0, 0.72, -0.2);
    backCushion.rotation.x = -0.1;
    backCushion.castShadow = true;
    backCushion.receiveShadow = true;
    chairGroup.add(backCushion);

    return chairGroup;
}