import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let mixer;
let clock = new THREE.Clock();
let isMentorInitialized = false;

const idleActions = [];
const activityActions = [];
const katanaActions = [];

let currentAction = null;
let timerId = null;

let loadedModel = null;
let currentReactionAction = null;
let isReacting = false;

// Ссылки на кость руки и саму катану
let handBone = null;
let katanaMesh = null;

const activityAnimationPaths = [
    '/frontend/models/activity1/Action_Cheer.glb',
    '/frontend/models/activity1/Action_Dance.glb',
    '/frontend/models/activity1/Action_Jump.glb'
];

const idleAnimationPaths = [
    'frontend/models/idle/AS_Fly_Jack_Anim.glb',
    'frontend/models/idle/AS_Idel_LookAround_LeftLeg_Anim.glb',
    'frontend/models/idle/AS_Idle_E_Anim.glb',
    'frontend/models/idle/AS_Idle_LookAround_RightLeg_Anim.glb',
    'frontend/models/idle/AS_Jack_Uppercut_Anim.glb',
    'frontend/models/idle/AS_Knee_Touch_Anim.glb',
    'frontend/models/idle/AS_Neck_Stretch_02_Anim.glb',
    'frontend/models/idle/AS_Neck_Stretch_Anim.glb',
    'frontend/models/idle/AS_Shoulder_Roll_Anim.glb',
    'frontend/models/idle/AS_Torso_Twist_Anim.glb',

];

const katanaAnimationPaths = [
    'frontend/models/katana/Combo_Attack_01_01_SeqFix.glb',
    'frontend/models/katana/Combo_Attack_01_02_SeqFix.glb'
];

window.init3DMentor = function() {
    if (isMentorInitialized) return;

    // 🔥 СНАЧАЛА НАХОДИМ КОНТЕЙНЕР (ОБЯЗАТЕЛЬНО ПЕРВЫМ!)
    const container = document.getElementById('mentor-3d-container');
    if (!container) return;

    isMentorInitialized = true;
    console.log("🟢 Инициализация 3D-ментатора");

    // И ТОЛЬКО ПОТОМ ИСПОЛЬЗУЕМ ЕГО РАЗМЕРЫ
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

    const textureLoader = new THREE.TextureLoader();
    const loader = new GLTFLoader();

// 🏠 ЗАГРУЖАЕМ КОМНАТУ-ФОН (с чистыми программными материалами)
    loader.load('frontend/models/RoomX.glb', function (roomGltf) {
        const roomMesh = roomGltf.scene;

        // Настрой масштаб и позицию комнаты под робота
        roomMesh.scale.set(0.5, 1.3, 1);
        roomMesh.position.set(0.8, -0.49, 0.3);

        // Создаем наш чистый материал в цветах приложения
        const roomMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e293b,     // Цвет --secondary-bg-color из твоего CSS
            roughness: 0.8,      // Матовая поверхность
            metalness: 0.1,      // Легкий отблеск
            side: THREE.DoubleSide // Видимость стен со всех сторон (изнутри и снаружи)
        });

        // Накладываем материал и включаем прием теней от робота
        roomMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = roomMaterial;
                child.receiveShadow = true; // Комната принимает тень
            }
        });


        // Загрузка картинки на заднюю стенку
    const textureLoader = new THREE.TextureLoader();

    // Укажи здесь точный путь к твоей картинке (например, 'frontend/img/image_wall.jpg')
    textureLoader.load('frontend/img/wall3.webp', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        // Создаем прямоугольник (ширина, высота). Подгони размеры под свою комнату, например (4.0, 2.5)
        const geometry = new THREE.PlaneGeometry(5.0, 3);

        // Используем MeshBasicMaterial, чтобы картинка была яркой и не зависела от теней и освещения
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });

        const wallPoster = new THREE.Mesh(geometry, material);

        // Ставим плоскость на заднюю стенку.
        // Координату Z (последнее число) сделай чуть впереди реальной стены (например, -2.49 или -1.99),
        // чтобы текстура не "мигала" из-за пересечения с геометрией комнаты.
        wallPoster.position.set(0.5, 0.5, -1.5);

        scene.add(wallPoster);
        console.log("🖼️ Картинка на задник успешно загружена");
    }, undefined, (err) => {
        console.error("❌ Ошибка загрузки картинки для задника:", err);
    });

        scene.add(roomMesh);
        console.log("🏠 3D-комната успешно загружена и покрашена из кода");
    }, undefined, function (error) {
        console.warn("⚠️ Не удалось загрузить комнату room.glb:", error);
    });

    // Загрузка ковра (Carpet)
    const gltfLoader = new GLTFLoader();

    // Убедись, что путь к файлу совпадает с твоим (например, с учетом регистра и папки)
    gltfLoader.load('frontend/models/Carpet.glb', (gltf) => {
        const carpetMesh = gltf.scene;

        // Создаем настраиваемый материал для ковра
        const carpetMaterial = new THREE.MeshStandardMaterial({
            color: 0x9e8d5a,     // Цвет ковра (можешь менять на любой hex, например 0x2b3748)
            roughness: 0.5,     // Высокая шероховатость (делает поверхность матовой, как ткань)
            metalness: 0.05      // Низкая металличность
        });

        // 2. 🔥 Задаем цвет через HSL-регуляторы
        // Создаем объект цвета и настраиваем параметры:
        // getHSL / setHSL принимает значения от 0 до 1:
        const baseColor = new THREE.Color(0x9e8d5a);

        const hsl = {};
        baseColor.getHSL(hsl); // Получаем текущий тон, насыщенность и яркость

        // 🎛️ ТВОИ РЕГУЛЯТОРЫ (меняй значения под себя от 0.0 до 1.0):
        hsl.s = 0.05; // Насыщенность (Saturation): меньше = бледнее/серее, больше = сочнее
        hsl.l = 0.1; // Яркость (Lightness): 0.0 = черный, 1.0 = белый, 0.5 = нормальный свет

        // Применяем измененные параметры обратно к материалу
        carpetMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);

        // Применяем материал ко всем элементам модели
        carpetMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = carpetMaterial;
                child.receiveShadow = true; // Ковер должен принимать тени от робота и комнаты
            }
        });

        // Позиционируем ковер на полу комнаты (подгони координаты под свою сцену, если нужно)
        carpetMesh.position.set(1, -0.5, 0);

        // Если ковер слишком большой или маленький, можно подправить масштаб:
        carpetMesh.scale.set(0.7 , 0.7,0.7);

        scene.add(carpetMesh);
        console.log("🧶 Ковер успешно добавлен в сцену");
    }, undefined, (error) => {
        console.error("❌ Ошибка загрузки ковра:", error);
    });



    loader.load('frontend/models/Idle_Start.glb', function (gltf) {
        loadedModel = gltf.scene;

        // Настраиваем отбрасывание тени роботом
        loadedModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);

        // 1. Сначала ставим робота идеально в центр
        loadedModel.position.x -= center.x;
        loadedModel.position.y -= center.y;
        loadedModel.position.z -= center.z;

        // 2. 🔥 Сдвигаем робота вправо (туда, где прозрачная заглушка)
        // Если он стоит недостаточно правее, увеличь 1.8 до 2.0 или 2.2
        loadedModel.position.x += maxDim * 2.3;
        loadedModel.position.y -= 0.35;
        textureLoader.load(
            'frontend/img/Emo_512.jpg',
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.generateMipmaps = true;
                texture.flipY = false;

                // === НАСТРОЙКА АТЛАСА 3x3 ===
                // 1. Указываем, что текстура должна зацикливаться (обязательно для offset)
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;

                // 2. Сжимаем масштаб текстуры до 1/3 (так как у нас сетка 3x3)
                //texture.repeat.set(1/3, 1/3);

                // 3. Выбираем конкретное лицо (Координаты от 0 до 2)
                // Столбцы (col): 0 - левый, 1 - центр, 2 - правый
                // Строки (row): 0 - низ, 1 - середина, 2 - верх
                const col = 0;
                const row = 1;
                //texture.offset.set(col / 3, row / 3);
                // =============================

                // Используем BasicMaterial без прозрачности! Лицо будет светиться как экран.
                const faceMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    color: 0xffffff // Белый базовый цвет, чтобы текстура передавалась 1 в 1
                });

                let faceFound = false;

                loadedModel.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material && (child.material.name === 'Bot_Face' || child.material.name.toLowerCase().includes('face'))) {
                            child.material = faceMaterial;
                            child.material.needsUpdate = true;
                            faceFound = true;
                        }
                    }
                });

                if (!faceFound) {
                    console.warn("⚠️ Материал 'Bot_Face' не найден!");
                }
            },
            undefined,
            (error) => {
                console.error("❌ Ошибка загрузки текстуры лица.", error);
            }
        );

        scene.add(loadedModel);

        // Ищем кость правой руки (поддерживаем разные варианты названий для стабильности)
        loadedModel.traverse((child) => {
            if (child.isBone) {
                const name = child.name.toLowerCase();
                if (name === 'righthand' || name === 'hand_r' || name === 'hand.r' || name === 'mixamorigrighthand') {
                    handBone = child;
                }
            }
        });

        // Загружаем катану и привязываем к руке (по умолчанию скрыта в idle)
        if (handBone) {
            // Исправлен путь к файлу катаны на корректную папку
            loader.load('frontend/models/Katana.glb', function (katanaGltf) {
                katanaMesh = katanaGltf.scene;

                // Настраиваем тени для катаны
                katanaMesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                handBone.add(katanaMesh);

                // Твои точные координаты в руке
                katanaMesh.position.set(-0.024, 0.062, 0.086);
                katanaMesh.rotation.set(-2.930, 2.010, 0.230);

                // В idle режиме катана скрыта
                katanaMesh.visible = false;

                console.log("🗡️ Катана успешно привязана к руке (right hand) и скрыта в idle");
            }, undefined, (err) => {
                console.error("❌ Ошибка загрузки katana.glb. Проверь точное имя файла и путь!", err);
            });
        } else {
            console.warn("⚠️ Кость правой руки (RightHand / Hand_R) не найдена в скелете!");
        }

    const maxDimCam = Math.max(size.x, size.y, size.z);
    let cameraDist = maxDimCam * 11;
    const yOffset = maxDimCam * 0.5;

    // 🔥 ПРОСТОЕ И ИДЕАЛЬНОЕ РЕШЕНИЕ:
    // Сдвигаем и камеру, и точку её взгляда вправо (по оси X на нужное число).
    // Робот при этом остается в центре своей 3D-сцены, но для камеры он смещается вправо.
    const rightShift = maxDim * 0; // Регулируй этот коэффициент, чтобы двигать центр экрана вправо

    camera.position.set(rightShift, yOffset, cameraDist);
    camera.lookAt(rightShift, yOffset, 0);

        // 4. Заставляем робота, стоящего справа, повернуть голову к камере
        loadedModel.lookAt(0, loadedModel.position.y, camera.position.z);

        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(loadedModel);
            const initialIdle = mixer.clipAction(gltf.animations[0]);

            initialIdle.play();
            currentAction = initialIdle;
            idleActions.push(initialIdle);

            loadAllAnimations();
            scheduleNextSwitch();

            mixer.addEventListener('finished', handleAnimationFinished);
        }
    }, undefined, function (error) {
        console.error('❌ Ошибка загрузки модели:', error);
    });

    function loadAllAnimations() {
        const animLoader = new GLTFLoader();

        idleAnimationPaths.forEach(path => {
            animLoader.load(path, function (animGltf) {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    const action = mixer.clipAction(animGltf.animations[0]);
                    idleActions.push(action);
                }
            });
        });

        activityAnimationPaths.forEach(path => {
            animLoader.load(path, function (animGltf) {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    const action = mixer.clipAction(animGltf.animations[0]);
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    activityActions.push(action);
                }
            });
        });

        katanaAnimationPaths.forEach(path => {
            animLoader.load(path, function (animGltf) {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    const action = mixer.clipAction(animGltf.animations[0]);
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    katanaActions.push(action);
                }
            });
        });
    }

    // ⚔️ ПО КЛИКУ: Показываем катану и запускаем боевую анимацию
    container.addEventListener('click', () => {
        if (katanaActions.length === 0 || isReacting) return;

        isReacting = true;
        clearTimeout(timerId);

        if (katanaMesh) {
            katanaMesh.visible = true; // Показываем катану для анимации с мечом
        }

        currentReactionAction = katanaActions[Math.floor(Math.random() * katanaActions.length)];

        currentReactionAction.reset();
        currentReactionAction.play();

        currentAction.crossFadeTo(currentReactionAction, 0.3, true);
        currentAction = currentReactionAction;
    });

    // 🛡️ КОГДА АНИМАЦИЯ ЗАВЕРШИЛАСЬ: Возвращаемся в idle и скрываем катану
    function handleAnimationFinished(event) {
        if (event.action === currentReactionAction) {
            isReacting = false;
            currentReactionAction = null;

            if (katanaMesh) {
                katanaMesh.visible = false; // Скрываем катану обратно при возврате в idle
            }

            const nextAction = idleActions[Math.floor(Math.random() * idleActions.length)];

            nextAction.reset();
            nextAction.play();

            currentAction.crossFadeTo(nextAction, 0.8, true);
            currentAction = nextAction;

            scheduleNextSwitch();
        }
    }

    function scheduleNextSwitch() {
        if (isReacting) return;

        const randomTime = Math.floor(Math.random() * 5000) + 5000;
        timerId = setTimeout(() => {
            switchAnimation();
        }, randomTime);
    }

    function switchAnimation() {
        if (idleActions.length <= 1 || isReacting) return;

        let nextAction;
        do {
            nextAction = idleActions[Math.floor(Math.random() * idleActions.length)];
        } while (nextAction === currentAction);

        nextAction.reset();
        nextAction.play();
        currentAction.crossFadeTo(nextAction, 1.0, true);
        currentAction = nextAction;

        scheduleNextSwitch();
    }
    // 🔥 Защита от растягиваний: следим за реальным размером HTML-блока
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

    function animate() {
        requestAnimationFrame(animate);

        // 🔥 ПАУЗА РЕНДЕРА, ЕСЛИ ЭКРАН СКРЫТ
        // Если контейнер скрыт (display: none), браузер вернет offsetParent === null
        // Мы прерываем выполнение, чтобы не грузить процессор и видеокарту
        if (container.offsetParent === null) return;

        const delta = clock.getDelta();
        if (mixer) mixer.update(delta);
        renderer.render(scene, camera);
    }
    animate();

};

window.triggerMentorAction = function(event) {
        console.log("🖱️ Клик по ментору! Доступно activity анимаций:", activityActions.length);

        if (activityActions.length === 0 || isReacting) {
            console.warn("⚠️ Анимации еще не загрузились или робот занят!");
            return;
        }

        isReacting = true;
        clearTimeout(timerId);

        if (katanaMesh) {
            katanaMesh.visible = false;
        }

        currentReactionAction = activityActions[Math.floor(Math.random() * activityActions.length)];

        currentReactionAction.reset();
        currentReactionAction.play();

        currentAction.crossFadeTo(currentReactionAction, 0.3, true);
        currentAction = currentReactionAction;
    };

// 🧪 ПЛАВНЫЙ ТЕСТОВЫЙ ПЕРЕХОД К КРОВАТИ ПО КЛАВИШЕ 'b'
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'b') {
            if (!loadedModel) return;

            console.log("🚶‍♂️ Робот плавно направляется к кровати...");

            const startX = loadedModel.position.x;
            const targetX = startX - 1.5; // Сдвиг влево к кровати

            // Целевой угол поворота в радианах (в сторону кровати слева — это примерно -PI / 2 или -1.57)
            const startRotationY = loadedModel.rotation.y;
            const targetRotationY = -Math.PI / 2;

            const startTime = performance.now();
            const turnDuration = 600;  // 0.6 секунды на плавный разворот
            const walkDuration = 1800; // 1.8 секунды на саму ходьбу (можно сделать больше для медленной ходьбы)
            const totalDuration = turnDuration + walkDuration;

            function animateStep(currentTime) {
                const elapsed = currentTime - startTime;
                const totalProgress = Math.min(elapsed / totalDuration, 1);

                if (elapsed < turnDuration) {
                    // ЭТАП 1: Плавный поворот головы/тела к кровати (смягчение через easeInOut)
                    const turnProgress = elapsed / turnDuration;
                    const easeTurn = turnProgress < 0.5 ? 2 * turnProgress * turnProgress : -1 + (4 - 2 * turnProgress) * turnProgress;

                    loadedModel.rotation.y = startRotationY + (targetRotationY - startRotationY) * easeTurn;
                } else {
                    // ЭТАП 2: Медленная ходьба с плавной поступью
                    const walkElapsed = elapsed - turnDuration;
                    const walkProgress = Math.min(walkElapsed / walkDuration, 1);

                    // Плавное замедление в конце (easeOut)
                    const easeWalk = 1 - Math.pow(1 - walkProgress, 3);

                    loadedModel.position.x = startX + (targetX - startX) * easeWalk;
                }

                if (totalProgress < 1) {
                    requestAnimationFrame(animateStep);
                } else {
                    console.log("✅ Робот аккуратно дошел до кровати и встал на точку.");
                }
            }

            requestAnimationFrame(animateStep);
        }
    });

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(window.init3DMentor, 300);
});
