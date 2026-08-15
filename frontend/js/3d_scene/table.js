import * as THREE from 'three';

export function createTable() {
    const tableGroup = new THREE.Group();

    const tableWidth = 1.6;
    const tableHeight = 0.8;
    const tableDepth = 0.6;
    const tableThickness = 0.05;

    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x333842, // В тон темного покрывала с кровати
        roughness: 0.7,
        metalness: 0.1
    });

    // Столешница
    const topGeometry = new THREE.BoxGeometry(tableWidth, tableThickness, tableDepth);
    const tableTop = new THREE.Mesh(topGeometry, tableMaterial);
    tableTop.position.set(0, tableHeight - (tableThickness / 2), 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Ножки
    const legGeometry = new THREE.BoxGeometry(tableThickness, tableHeight - tableThickness, tableDepth);

    const leftLeg = new THREE.Mesh(legGeometry, tableMaterial);
    leftLeg.position.set(-(tableWidth / 2) + (tableThickness / 2), (tableHeight - tableThickness) / 2, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    tableGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, tableMaterial);
    rightLeg.position.set((tableWidth / 2) - (tableThickness / 2), (tableHeight - tableThickness) / 2, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    tableGroup.add(rightLeg);

    return tableGroup;
}