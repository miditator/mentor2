import * as THREE from 'three';

export function createLamp() {
    const lampGroup = new THREE.Group();

    // 1. Тёмное основание (База)
    const baseRadius = 0.08;
    const baseHeight = 0.06;
    const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9,
        metalness: 0.1
    });
    const lampBase = new THREE.Mesh(baseGeometry, baseMaterial);
    lampBase.position.y = baseHeight / 2;
    lampBase.castShadow = true;
    lampBase.receiveShadow = true;
    lampGroup.add(lampBase);

    // 2. Светящийся плафон
    const shadeRadius = 0.08;
    const shadeHeight = 0.12;
    const shadeGeometry = new THREE.CylinderGeometry(shadeRadius, shadeRadius, shadeHeight, 32);
    const shadeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffcc77,
        emissive: 0xffcc77,
        emissiveIntensity: 3,
        roughness: 0.3,
        metalness: 0.0
    });
    const lampShade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    lampShade.position.y = baseHeight + (shadeHeight / 2);
    lampGroup.add(lampShade);



    return lampGroup;
}