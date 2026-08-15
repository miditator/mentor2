import * as THREE from 'three';

export function createComputer() {
    const pcGroup = new THREE.Group();

    // Единый материал для всего пластика (черный матовый)
    const plasticMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
    });

    // --- МОНИТОР ---

    // 1. Подставка (база)
    const baseGeometry = new THREE.BoxGeometry(0.25, 0.01, 0.15);
    const monitorBase = new THREE.Mesh(baseGeometry, plasticMaterial);
    monitorBase.position.set(0, 0.005, 0);
    monitorBase.castShadow = true;
    monitorBase.receiveShadow = true;
    pcGroup.add(monitorBase);

    // 2. Ножка монитора
    const pillarGeometry = new THREE.BoxGeometry(0.05, 0.12, 0.03);
    const monitorPillar = new THREE.Mesh(pillarGeometry, plasticMaterial);
    monitorPillar.position.set(0, 0.065, -0.02);
    monitorPillar.castShadow = true;
    monitorPillar.receiveShadow = true;
    pcGroup.add(monitorPillar);

    // 3. Рамка экрана
    const frameGeometry = new THREE.BoxGeometry(0.65, 0.4, 0.03);
    const monitorFrame = new THREE.Mesh(frameGeometry, plasticMaterial);
    monitorFrame.position.set(0, 0.26, 0);
    monitorFrame.castShadow = true;
    monitorFrame.receiveShadow = true;
    pcGroup.add(monitorFrame);

    // 4. Генератор градиента для экрана
    function createDesktopGradient() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#0f172a'); // Глубокий темно-синий
        gradient.addColorStop(1, '#0ea5e9'); // Яркий бирюзовый

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        return new THREE.CanvasTexture(canvas);
    }

    // 5. Сам светящийся экран
    const screenGeometry = new THREE.PlaneGeometry(0.63, 0.38);
    const screenMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: createDesktopGradient(),
        emissiveIntensity: 1.0,
        roughness: 0.2,
        metalness: 0.5
    });
    const monitorScreen = new THREE.Mesh(screenGeometry, screenMaterial);
    monitorScreen.position.set(0, 0.26, 0.016);
    pcGroup.add(monitorScreen);

    // --- ПЕРИФЕРИЯ ---

    // 6. Клавиатура
    const keyboardGeometry = new THREE.BoxGeometry(0.45, 0.01, 0.15);
    const keyboard = new THREE.Mesh(keyboardGeometry, plasticMaterial);
    keyboard.position.set(0, 0.005, 0.2);
    keyboard.castShadow = true;
    keyboard.receiveShadow = true;
    pcGroup.add(keyboard);

    // 7. Мышка
    const mouseGeometry = new THREE.BoxGeometry(0.06, 0.015, 0.1);
    const mouse = new THREE.Mesh(mouseGeometry, plasticMaterial);
    mouse.position.set(0.32, 0.0075, 0.2);
    mouse.rotation.y = -0.15;
    mouse.castShadow = true;
    mouse.receiveShadow = true;
    pcGroup.add(mouse);

    // Возвращаем собранную группу
    return pcGroup;
}