import * as THREE from 'three';
import { createComputer } from './computer.js';
import { createChair } from './chair.js';

export function createOfficeSet() {
    const officeGroup = new THREE.Group();

    // ==========================================
    // 1. СТОЛ
    // ==========================================
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

    officeGroup.add(tableGroup);


    // ==========================================
    // 2. НАСТОЛЬНАЯ ЛАМПА
    // ==========================================
    const lampGroup = new THREE.Group();

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

    const shadeRadius = 0.08;
    const shadeHeight = 0.12;
    const shadeGeometry = new THREE.CylinderGeometry(shadeRadius, shadeRadius, shadeHeight, 32);
    const shadeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffeedd,
        emissiveIntensity: 1.5,
        roughness: 0.3,
        metalness: 0.0
    });
    const lampShade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    lampShade.position.y = baseHeight + (shadeHeight / 2);
    lampGroup.add(lampShade);

    const lampLight = new THREE.PointLight(0xffeedd, 2.0, 3.0);
    lampLight.position.y = baseHeight + (shadeHeight / 2);
    lampLight.castShadow = true;
    lampLight.shadow.bias = -0.005;
    lampGroup.add(lampLight);

    // Локальная позиция лампы (чтобы стояла на столе)
    lampGroup.position.set(0.1, tableHeight, -0.8);
    lampGroup.scale.set(0.8, 1.2, 0.8);
    officeGroup.add(lampGroup);


    // ==========================================
    // 3. КОМПЬЮТЕР (Твои точные координаты из main_scene_2)
    // ==========================================
    const pcGroup = createComputer();
    pcGroup.position.set(2.9, 0.05, -1.3);
    pcGroup.rotation.set(0, -1.7, 0);
    officeGroup.add(pcGroup);


    // ==========================================
    // 4. СТУЛ (Твои точные координаты из main_scene_2)
    // ==========================================
    const chairGroup = createChair();
    chairGroup.position.set(2, -0.5, -0.9);
    chairGroup.rotation.y = Math.PI / 6;
    officeGroup.add(chairGroup);


    return officeGroup;
}