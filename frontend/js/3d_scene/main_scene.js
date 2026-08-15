import * as THREE from 'three';
import { createRoom } from './room.js';
import { loadCarpet } from './carpet.js';
import { loadBed } from './bed.js';
import { MentorCharacter } from './character.js';
import { createComputer } from './computer.js';
import { createChair } from './chair.js';
import { createTable } from './table.js';
import { createLamp } from './lamp.js';
import { createKatanaStand } from './katana_stand.js';
import { loadKatana } from './katana.js';
import { createReadingChair } from './reading_chair.js';
import { createBedsideTable } from './bedside_table.js';
import { createRoundCoffeeTable } from './round_coffee_table.js';
import { createOpenBook } from './open_book.js';


let isMentorInitialized = false;
let characterInstance = null;
let clock = new THREE.Clock();

window.init3DMentor = function() {
    if (isMentorInitialized) return;

    const container = document.getElementById('mentor-3d-container');
    if (!container) return;

    isMentorInitialized = true;
    console.log("🟢 Инициализация финальной 3D-сцены");

    const rect = container.getBoundingClientRect();
    let width = rect.width || 400;
    let height = rect.height || 130;

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(20, width / height, 0.1, 1000);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // 🏗️ ЗАГРУЖАЕМ ОБЪЕКТЫ СЦЕНЫ (без контроллеров и лишних callback-ов)
    const textureLoader = new THREE.TextureLoader();

    // 1. Новая модульная комната (4 стены, пол, потолок, постер)
    createRoom(scene, textureLoader);

    // 2. Ковер
    loadCarpet(scene);

    // 3. Кровать
    loadBed(
        scene,
        [-1.4, -0.55, -2],       // Изменяй координаты здесь
        [0, 1.5, 0],          // Изменяй поворот здесь
        [1.8, 1.8, 1.8]       // Изменяй размер здесь
    );

    // 4. Робот

    const mentorWaypoints = {
        bed: { x: -1.2, z: -1.4, ry: -Math.PI },
        chair: { x: 0.5, z: -1.5, ry: Math.PI / 1 }
        // Сюда же потом сможешь добавить:
        // katana: { x: -1.5, z: 0, ry: Math.PI }
    };
    // Передаем точки третьим параметром
    characterInstance = new MentorCharacter(scene, container, mentorWaypoints);
    window.characterInstance = characterInstance;


    // 🪑 СТОЛ
    const table = createTable();
    table.position.set(2.3, -0.75, -1.1); // Твои точные координаты пола/стола
    table.rotation.set(0, -1.7, 0);
    scene.add(table);

    // 💡 ЛАМПА (ставим на стол или настраивай отдельно)
    const lamp = createLamp();
    lamp.position.set(2.4, 0.05, -1.9); // Твои точные координаты лампы
    lamp.scale.set(0.8, 1.2, 0.8);
    scene.add(lamp);

    // 4. Компьютер 👈 ДОБАВЛЯЕМ СЮДА
    const pcGroup = createComputer();
    pcGroup.position.set(2.4, 0.05, -0.8);
    pcGroup.rotation.set(0, -1.7, 0);// Координаты столешницы
    scene.add(pcGroup);

    // 5. Офисный стул 👈 ДОБАВЛЯЕМ СЮДА
    const chairGroup = createChair();
    // Ставим стул на пол (Y = -0.5, как у ковра и стола) перед столом
    chairGroup.position.set(1.6, -0.5, -0.9);
    // Немного поворачиваем его для живости, будто из-за него только что встали
    chairGroup.rotation.y = Math.PI / 6;
        chairGroup.scale.set (0.8  ,0.8,0.8);

    scene.add(chairGroup);

    // 🛋 УЮТНОЕ КРЕСЛО ДЛЯ ЧТЕНИЯ
 const readingChair = createReadingChair();
 // Ставим его на уровень пола (Y = -0.5) где-нибудь в углу или возле кровати
 readingChair.position.set(0.5, -0.6, -1.75);
  readingChair.scale.set(0.65,0.65,0.65)
 readingChair.rotation.y = Math.PI / 38; // Слегка разворачиваем к центру комнаты
 scene.add(readingChair);


// 1. Тумбочка возле кровати
const bedsideTable = createBedsideTable();
bedsideTable.position.set(-2.1, -0.5, -1.2);
bedsideTable.rotation.set(0, 1.5, 0);
bedsideTable.scale.set(0.65,0.8,0.65)// Настрой под позицию кровати
scene.add(bedsideTable);

// 2. Круглый журнальный столик возле кресла
const coffeeTable = createRoundCoffeeTable();
coffeeTable.position.set(-0, -0.5, -1.5);
coffeeTable.scale.set(0.65,0.65,0.65)// Настрой рядом с креслом для чтения
scene.add(coffeeTable);

    // 🗡️ СТОЙКА ДЛЯ КАТАНЫ
    const katanaStand = createKatanaStand();
    katanaStand.position.set(-1.75, -0.5, 0); // Настрой координаты по вкусу
    katanaStand.rotation.set(0, 0.5, 0);       // Настрой поворот
    katanaStand.scale.set(0.7,0.5,0.2,)
    scene.add(katanaStand);

    loadKatana(
    scene,
    [-1.7, 0.05, 0],   // 📍 Позиция [X, Y, Z] (поставь ровно на свою стойку)
    [0, 0.2, 1.5],          // 🔄 Поворот [X, Y, Z]
    [0.7, 0.9,0.5]           // 📐 Масштаб [X, Y, Z]
);

    // Настройка начальной позиции камеры
    camera.position.set(0, 0.3, 5);
    camera.lookAt(0, 0.3, 0);

    // Ресайз контейнера
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const w = entry.contentRect.width;
            const h = entry.contentRect.height;
            if (w > 0 && h > 0) {
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }
        }
    });
    resizeObserver.observe(container);

const fpsLimit = 30;
    const frameInterval = 1000 / fpsLimit;
    let lastFrameTime = performance.now();

    function animate(currentTime) {
        requestAnimationFrame(animate);
        if (container.offsetParent === null) return;

        // Вычисляем разницу во времени между кадрами
        const deltaTime = currentTime - lastFrameTime;

        // Если прошло меньше времени, чем нужно для одного кадра при 30 FPS — пропускаем отрисовку
        if (deltaTime < frameInterval) {
            return;
        }

        // Корректируем время с учетом погрешности для плавной анимации
        lastFrameTime = currentTime - (deltaTime % frameInterval);

        // Переводим миллисекунды в секунды для микшера анимаций
        const delta = deltaTime / 1000;

        if (characterInstance) {
            characterInstance.update(delta);
        }

        renderer.render(scene, camera);
    }

    // 🔥 Запускаем цикл ровно один раз (параметр currentTime передастся автоматически)
    requestAnimationFrame(animate);
};



document.addEventListener("DOMContentLoaded", () => {
    setTimeout(window.init3DMentor, 300);
});


