import * as THREE from 'three';

export function createRoundCoffeeTable() {
    const group = new THREE.Group();

    // Материалы
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0xd9c3b0, // Светлая столешница
        roughness: 0.4
    });
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x2b2b2b, // Стандартный темный цвет для ножки и базы
        metalness: 0.8,
        roughness: 0.3
    });
    const bookCoverMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b5998, // Стильная синяя обложка книги
        roughness: 0.5
    });
    const bookPagesMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5dc, // Бежевый цвет страниц
        roughness: 0.9
    });

    // 1. Верхняя круглая столешница
    const topGeo = new THREE.CylinderGeometry(0.225, 0.225, 0.03, 32);
    const top = new THREE.Mesh(topGeo, topMaterial);
    top.position.y = 0.45;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 2. Центральная опорная ножка
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.43, 16);
    const leg = new THREE.Mesh(legGeo, legMaterial);
    leg.position.y = 0.23;
    leg.castShadow = true;
    group.add(leg);

    // 3. Круглое основание столика
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32);
    const base = new THREE.Mesh(baseGeo, legMaterial);
    base.position.y = 0.01;
    base.castShadow = true;
    group.add(base);

    // 4. Книжка на столешнице (сделали толще)
    const bookGroup = new THREE.Group();

    // Обложка (увеличена высота/толщина)
    const coverGeo = new THREE.BoxGeometry(0.14, 0.025, 0.1);
    const cover = new THREE.Mesh(coverGeo, bookCoverMaterial);
    cover.position.y = 0.012;
    cover.castShadow = true;
    cover.receiveShadow = true;
    bookGroup.add(cover);

    // Страницы (увеличены по высоте)
    const pagesGeo = new THREE.BoxGeometry(0.13, 0.018, 0.09);
    const pages = new THREE.Mesh(pagesGeo, bookPagesMaterial);
    pages.position.y = 0.027;
    pages.castShadow = true;
    pages.receiveShadow = true;
    bookGroup.add(pages);

    // Позиционируем книжку на поверхности столешницы
    bookGroup.position.set(0.05, 0.465, 0.03);
    bookGroup.rotation.y = 0.4;
    group.add(bookGroup);

    return group;
}