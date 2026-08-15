import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class SceneController {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.transformControls = null;
        this.managedObjects = [];
        this.currentIndex = -1;

        this.initTransformControls();
        this.initCameraZoom();
        this.initKeyboardShortcuts();
    }

    // Регистрируем объекты, которыми хотим управлять по очереди
    registerObject(mesh, name) {
        if (!mesh) return;
        mesh.userData.name = name || `Object_${this.managedObjects.length}`;
        this.managedObjects.push(mesh);

        // Если это первый объект, автоматически цепляем его
        if (this.currentIndex === -1) {
            this.selectObject(0);
        }
    }

    selectObject(index) {
        if (this.managedObjects.length === 0) return;

        this.currentIndex = index % this.managedObjects.length;
        const targetObj = this.managedObjects[this.currentIndex];

        this.transformControls.attach(targetObj);
        // 🔥 Исправлено: console.log вместо console.🎯
        console.log(`🎯 [Контроллер] Выбран объект: "${targetObj.userData.name}"`);
    }

    nextObject() {
        if (this.managedObjects.length === 0) return;
        const nextIdx = (this.currentIndex + 1) % this.managedObjects.length;
        this.selectObject(nextIdx);
    }

    initTransformControls() {
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.scene.add(this.transformControls);

        // При изменении трансформации выводим готовый код в консоль F12
        this.transformControls.addEventListener('change', () => {
            const obj = this.transformControls.object;
            if (!obj) return;

            const p = obj.position;
            const r = obj.rotation;
            const s = obj.scale;
            const name = obj.userData.name || 'Объект';

            console.clear();
            console.log(`📍 [${name}] актуальные параметры для кода:`);
            console.log(`mesh.position.set(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)});`);
            console.log(`mesh.rotation.set(${r.x.toFixed(3)}, ${r.y.toFixed(3)}, ${r.z.toFixed(3)});`);
            console.log(`mesh.scale.set(${s.x.toFixed(3)}, ${s.y.toFixed(3)}, ${s.z.toFixed(3)});`);
        });
    }

    initCameraZoom() {
        // Управление приближением/удалением камеры с помощью колесика мыши (или тачпада)
        window.addEventListener('wheel', (event) => {
            event.preventDefault();

            // Меняем параметр position.z (приближение)
            const zoomSpeed = 0.5;
            if (event.deltaY < 0) {
                this.camera.position.z -= zoomSpeed; // Приближаем
            } else {
                this.camera.position.z += zoomSpeed; // Удаляем
            }

            // 🔥 Исправлено: console.log вместо console.🔍
            console.log(`🔍 [Камера Zoom] текущая дистанция Z: ${this.camera.position.z.toFixed(2)}`);
        }, { passive: false });
    }

  initKeyboardShortcuts() {
        window.addEventListener('keydown', (event) => {
            // Безопасная проверка: если ты печатаешь текст в input, игнорируем нажатия
            const tagName = event.target?.tagName?.toLowerCase();
            if (tagName === 'input' || tagName === 'textarea') return;

            const key = event.key.toLowerCase();

            // 🔥 МАГИЯ: Клавиша 'H' выносит 3D-сцену поверх всех прогресс-баров
            if (key === 'h') {
                const container = document.getElementById('mentor-3d-container');
                if (container) {
                    if (container.style.zIndex === '9999') {
                        container.style.zIndex = '0';
                        console.log("🙉 Обычный режим (Интерфейс работает, 3D на фоне)");
                    } else {
                        container.style.zIndex = '9999';
                        console.log("🙈 Режим настройки (3D ПОВЕРХ интерфейса, можно таскать стрелочки)");
                    }
                }
            }

            // Переключение между объектами по клавише TAB
            if (key === 'tab') {
                event.preventDefault(); // Чтобы страница не прыгала по ссылкам
                this.nextObject();
            }

            // Переключение режимов TransformControls
            if (key === 'w') {
                this.transformControls.setMode('translate');
                console.log("🛠️ Режим: Перемещение (Position)");
            }
            if (key === 'e') {
                this.transformControls.setMode('rotate');
                console.log("🛠️ Режим: Вращение (Rotation)");
            }
            if (key === 'r') {
                this.transformControls.setMode('scale');
                console.log("🛠️ Режим: Масштаб (Scale)");
            }
        });
    }
}