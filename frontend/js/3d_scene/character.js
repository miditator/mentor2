import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MovementEngine } from './movement.js';
import { createOpenBook } from './open_book.js'; // 🔥 Импортируем твою открытую книгу

export class MentorCharacter {
    constructor(scene, container, customWaypoints = {}, onLoaded = null) {
        this.scene = scene;
        this.container = container;
        this.customWaypoints = customWaypoints;
        this.onLoaded = onLoaded;

        this.mixer = null;
        this.loadedModel = null;
        this.handBone = null;
        this.katanaMesh = null;
        this.bookMesh = null; // 🔥 Ссылка на открытую книгу

        this.idleActions = [];
        this.activityActions = [];
        this.katanaActions = [];
        this.sleepActions = [];
        this.chairActions = [];

        this.walkAction = null;

        this.currentAction = null;
        this.currentReactionAction = null;
        this.isReacting = false;
        this.timerId = null;

        // Переменная для "запоминания" следующей точки
        this.pendingTarget = null;

        this.visualRoot = null;
        this.visualRootFade = { active: false, progress: 0, duration: 0.8, startY: 0, targetY: 0 };
        this.visualRootPosFade = { active: false, progress: 0, duration: 1.0, startZ: 0, targetZ: 0, startY: 0, targetY: 0 };

        this.sleepOffsetZ = 0;
        this.sleepOffsetY = 0.1;
        this.sleepMoveDuration = 1.2;

        this.chairAnimationPaths = [
            'frontend/models/chair/chair_enter.glb',
            'frontend/models/chair/chair_loop.glb',
            'frontend/models/chair/chair_exit.glb'
        ];
        this.isChairState = false;

        this.activityAnimationPaths = [
            'frontend/models/activity1/Action_Cheer.glb',
            'frontend/models/activity1/Action_Dance.glb',
            'frontend/models/activity1/Action_Jump.glb'
        ];

        this.idleAnimationPaths = [
            'frontend/models/idle/AS_Fly_Jack_Anim.glb',
            'frontend/models/idle/AS_Idel_LookAround_LeftLeg_Anim.glb',
            'frontend/models/idle/AS_Idle_E_Anim.glb',
            'frontend/models/idle/AS_Idle_LookAround_RightLeg_Anim.glb',
            'frontend/models/idle/AS_Jack_Uppercut_Anim.glb',
            'frontend/models/idle/AS_Knee_Touch_Anim.glb',
            'frontend/models/idle/AS_Neck_Stretch_02_Anim.glb',
            'frontend/models/idle/AS_Neck_Stretch_Anim.glb',
            'frontend/models/idle/AS_Shoulder_Roll_Anim.glb',
            'frontend/models/idle/AS_Torso_Twist_Anim.glb'
        ];

        this.katanaAnimationPaths = [
            'frontend/models/katana/Combo_Attack_01_01_SeqFix.glb',
            'frontend/models/katana/Combo_Attack_01_02_SeqFix.glb'
        ];

        this.sleepAnimationPaths = [
            'frontend/models/sleep/sleep_enter.glb',
            'frontend/models/sleep/sleep_loop.glb',
            'frontend/models/sleep/sleep_exit.glb'
        ];
        this.isSleepingState = false;

        this.init();
    }

    init() {
        const loader = new GLTFLoader();
        const textureLoader = new THREE.TextureLoader();

        loader.load('frontend/models/Idle_Start.glb', (gltf) => {
            this.loadedModel = gltf.scene;

            this.visualRoot = new THREE.Group();
            while (this.loadedModel.children.length > 0) {
                this.visualRoot.add(this.loadedModel.children[0]);
            }
            this.loadedModel.add(this.visualRoot);

            this.loadedModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            const box = new THREE.Box3().setFromObject(this.loadedModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            this.loadedModel.position.x -= center.x;
            this.loadedModel.position.y -= center.y;
            this.loadedModel.position.z -= center.z;

            this.loadedModel.position.x += maxDim * 1.8;
            this.loadedModel.position.y -= 0.35;
            this.loadedModel.rotation.set(0, -0.2, 0);

            const waypoints = {
                home: {
                    x: this.loadedModel.position.x,
                    z: this.loadedModel.position.z,
                    ry: this.loadedModel.rotation.y
                },
                ...this.customWaypoints
            };

            this.movement = new MovementEngine(this.loadedModel, waypoints);

            this.movement.onStartMove = () => {
                if (this.walkAction && this.currentAction !== this.walkAction) {
                    this.walkAction.reset();
                    this.walkAction.play();
                    this.currentAction.crossFadeTo(this.walkAction, 0.4, true);
                    this.currentAction = this.walkAction;
                }
            };

            this.applyTimeBasedState(waypoints);

            textureLoader.load('frontend/img/Emo_512.jpg', (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.generateMipmaps = true;
                texture.flipY = false;

                const faceMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    color: 0xffffff
                });

                let faceFound = false;
                this.loadedModel.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material && (child.material.name === 'Bot_Face' || child.material.name.toLowerCase().includes('face'))) {
                            child.material = faceMaterial;
                            child.material.needsUpdate = true;
                            faceFound = true;
                        }
                    }
                });
            });

            this.scene.add(this.loadedModel);
            if (this.onLoaded) this.onLoaded(this.loadedModel);

            this.loadedModel.traverse((child) => {
                if (child.isBone) {
                    const name = child.name.toLowerCase();
                    if (name === 'righthand' || name === 'hand_r' || name === 'hand.r' || name === 'mixamorigrighthand') {
                        this.handBone = child;
                    }
                }
            });

            if (this.handBone) {
                // 1. Загрузка катаны
                loader.load('frontend/models/Katana.glb', (katanaGltf) => {
                    this.katanaMesh = katanaGltf.scene;
                    this.katanaMesh.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.handBone.add(this.katanaMesh);
                    this.katanaMesh.position.set(-0.024, 0.062, 0.086);
                    this.katanaMesh.rotation.set(-2.930, 2.010, 0.230);
                    this.katanaMesh.visible = false;
                });

                // 2. 🔥 ДОБАВЛЕНИЕ ОТКРЫТОЙ КНИГИ В РУКУ
                this.bookMesh = createOpenBook();
                // Координаты книги в руке (можно подогнать точнее, посмотрев, как ложится в анимацию)
                this.bookMesh.position.set(0.05, 0.1, 0.06);
                this.bookMesh.rotation.set(-2.328, -0.15, -1.25);
                this.bookMesh.scale.set(1.1,2,1.6)

                // Если робот УЖЕ в кресле по времени старта, показываем сразу, иначе скрываем
                this.bookMesh.visible = this.isChairState;
                this.handBone.add(this.bookMesh);
            }

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.loadedModel);
                const initialIdle = this.mixer.clipAction(gltf.animations[0]);
                this.idleActions.push(initialIdle);

                if (!this.isSleepingState && !this.isChairState) {
                    initialIdle.play();
                    this.currentAction = initialIdle;
                    this.scheduleNextSwitch();
                }

                this.loadAllAnimations();
                this.mixer.addEventListener('finished', (e) => this.handleAnimationFinished(e));
            }
        });
    }

    applyTimeBasedState(waypoints) {
        const hour = new Date().getHours();

        if (hour >= 23 || hour < 7) {
            this.isSleepingState = true;
            this.isReacting = false;

            this.loadedModel.position.x = waypoints.bed.x;
            this.loadedModel.position.z = waypoints.bed.z;
            this.loadedModel.rotation.y = waypoints.bed.ry;

            if (this.visualRoot) {
                this.visualRoot.position.z = this.sleepOffsetZ;
                this.visualRoot.position.y = this.sleepOffsetY;
            }
        } else if (hour >= 19 && hour < 23) {
            this.isChairState = true;
            this.isReacting = false;

            this.loadedModel.position.x = waypoints.chair.x;
            this.loadedModel.position.z = waypoints.chair.z;
            this.loadedModel.rotation.y = waypoints.chair.ry + Math.PI;
        } else {
            this.loadedModel.position.x = waypoints.home.x;
            this.loadedModel.position.z = waypoints.home.z;
            this.loadedModel.rotation.y = waypoints.home.ry;
        }
    }

    loadAllAnimations() {
        const animLoader = new GLTFLoader();

        animLoader.load('frontend/models/walk.glb', (animGltf) => {
            if (animGltf.animations && animGltf.animations.length > 0) {
                this.walkAction = this.mixer.clipAction(animGltf.animations[0]);
                this.walkAction.setLoop(THREE.LoopRepeat);
            }
        });

        this.idleAnimationPaths.forEach(path => {
            animLoader.load(path, (animGltf) => {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    this.idleActions.push(this.mixer.clipAction(animGltf.animations[0]));
                }
            });
        });

        this.activityAnimationPaths.forEach(path => {
            animLoader.load(path, (animGltf) => {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    const action = this.mixer.clipAction(animGltf.animations[0]);
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    this.activityActions.push(action);
                }
            });
        });

        this.katanaAnimationPaths.forEach(path => {
            animLoader.load(path, (animGltf) => {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    const action = this.mixer.clipAction(animGltf.animations[0]);
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    this.katanaActions.push(action);
                }
            });
        });

        this.sleepAnimationPaths.forEach((path, index) => {
            animLoader.load(path, (animGltf) => {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    const action = this.mixer.clipAction(animGltf.animations[0]);
                    if (index === 1) {
                        action.setLoop(THREE.LoopRepeat);
                        if (this.isSleepingState) {
                            if (this.currentAction) this.currentAction.stop();
                            action.play();
                            this.currentAction = action;
                        }
                    } else {
                        action.setLoop(THREE.LoopOnce);
                        action.clampWhenFinished = true;
                    }
                    this.sleepActions[index] = action;
                }
            });
        });

        this.chairAnimationPaths.forEach((path, index) => {
            animLoader.load(path, (animGltf) => {
                if (animGltf.animations && animGltf.animations.length > 0) {
                    const action = this.mixer.clipAction(animGltf.animations[0]);
                    if (index === 1) {
                        action.setLoop(THREE.LoopRepeat);
                        if (this.isChairState) {
                            if (this.currentAction) this.currentAction.stop();
                            action.play();
                            this.currentAction = action;
                        }
                    } else {
                        action.setLoop(THREE.LoopOnce);
                        action.clampWhenFinished = true;
                    }
                    this.chairActions[index] = action;
                }
            });
        });
    }

 // ==========================================
    // 🔥 ЕДИНЫЙ УМНЫЙ РОУТЕР МАРШРУТОВ (Стейт-машина)
    // ==========================================
    command(target) {
        // Блокируем клики, пока идет анимация перехода или движения
        if (this.isReacting) return;

        // 🏠 ТОЧКА 1 (ЦЕНТР / ДОМ)
        if (target === 'home') {
            if (this.isSleepingState) {
                // Очищаем цель, так как wakeUp() и так в конце приведет его домой
                this.pendingTarget = null;
                this.wakeUp();
            } else if (this.isChairState) {
                // Очищаем цель, так как standUpAndGoHome() и так ведет его домой
                this.pendingTarget = null;
                this.standUpAndGoHome();
            } else {
                // Если он УЖЕ дома — просто запускаем экшен (катана или танцы), без ходьбы!
                this.triggerActivityAction();
            }
            return;
        }

        // 🛏️ ТОЧКА 2 (КРОВАТЬ)
        if (target === 'bed') {
            if (this.isSleepingState) return; // Уже спит
            if (this.isChairState) {
                this.pendingTarget = 'bed'; // Запоминаем, что нужно в кровать
                this.standUpAndGoHome(); // Встаем и идем домой
            } else {
                this.goSleep(); // Идем из дома в кровать
            }
            return;
        }

        // 🪑 ТОЧКА 3 (КРЕСЛО)
        if (target === 'chair') {
            if (this.isChairState) return; // Уже сидит
            if (this.isSleepingState) {
                this.pendingTarget = 'chair'; // Запоминаем, что нужно в кресло
                this.wakeUp(); // Встаем с кровати и идем домой
            } else {
                this.goToChairAndSit(); // Идем из дома в кресло
            }
            return;
        }
    }

    triggerActivityAction() {
        const hasActivity = this.activityActions.length > 0;
        const hasKatana = this.katanaActions.length > 0;

        if (!hasActivity && !hasKatana) return;

        this.isReacting = true;
        clearTimeout(this.timerId);

        let isKatanaChosen = false;
        if (hasActivity && hasKatana) {
            isKatanaChosen = Math.random() > 0.5;
        } else if (hasKatana) {
            isKatanaChosen = true;
        }

        if (isKatanaChosen) {
            if (this.katanaMesh) this.katanaMesh.visible = true;
            if (this.bookMesh) this.bookMesh.visible = false; // 🔥 Прячем книгу

            const randomIndex = Math.floor(Math.random() * this.katanaActions.length);
            this.currentReactionAction = this.katanaActions[randomIndex];
        } else {
            if (this.katanaMesh) this.katanaMesh.visible = false;
            if (this.bookMesh) this.bookMesh.visible = false; // 🔥 Прячем книгу

            const randomIndex = Math.floor(Math.random() * this.activityActions.length);
            this.currentReactionAction = this.activityActions[randomIndex];
        }

        this.currentReactionAction.reset();
        this.currentReactionAction.play();
        this.currentAction.crossFadeTo(this.currentReactionAction, 0.3, true);
        this.currentAction = this.currentReactionAction;
    }

    handleAnimationFinished(event) {
        if (event.action === this.currentReactionAction) {
            this.isReacting = false;
            this.currentReactionAction = null;
            if (this.katanaMesh) this.katanaMesh.visible = false;

            const nextAction = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];
            nextAction.reset();
            nextAction.play();

            this.currentAction.crossFadeTo(nextAction, 0.8, true);
            this.currentAction = nextAction;

            this.scheduleNextSwitch();
        }
    }

    scheduleNextSwitch() {
        if (this.isReacting) return;
        const randomTime = Math.floor(Math.random() * 5000) + 5000;
        this.timerId = setTimeout(() => {
            this.switchAnimation();
        }, randomTime);
    }

    switchAnimation() {
        if (this.idleActions.length <= 1 || this.isReacting) return;
        let nextAction;
        do {
            nextAction = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];
        } while (nextAction === this.currentAction);

        nextAction.reset();
        nextAction.play();
        this.currentAction.crossFadeTo(nextAction, 1.0, true);
        this.currentAction = nextAction;

        this.scheduleNextSwitch();
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);

        if (this.visualRootFade && this.visualRootFade.active) {
            this.visualRootFade.progress += delta;
            let t = this.visualRootFade.progress / this.visualRootFade.duration;
            if (t >= 1) {
                t = 1;
                this.visualRootFade.active = false;
            }
            const easeT = t * t * (3.0 - 2.0 * t);
            this.visualRoot.rotation.y = this.visualRootFade.startY + (this.visualRootFade.targetY - this.visualRootFade.startY) * easeT;
        }

        if (this.visualRootPosFade && this.visualRootPosFade.active) {
            this.visualRootPosFade.progress += delta;
            let t = this.visualRootPosFade.progress / this.visualRootPosFade.duration;
            if (t >= 1) {
                t = 1;
                this.visualRootPosFade.active = false;
            }
            const easeT = t * t * (3.0 - 2.0 * t);
            if (this.visualRoot) {
                this.visualRoot.position.z = this.visualRootPosFade.startZ + (this.visualRootPosFade.targetZ - this.visualRootPosFade.startZ) * easeT;
                this.visualRoot.position.y = this.visualRootPosFade.startY + (this.visualRootPosFade.targetY - this.visualRootPosFade.startY) * easeT;
            }
        }
    }

    goSleep() {
        if (this.sleepActions.length < 2 || this.isSleepingState || this.isReacting || !this.movement) return;

        this.isReacting = true;
        clearTimeout(this.timerId);

        if (this.katanaMesh) this.katanaMesh.visible = false;
        if (this.bookMesh) this.bookMesh.visible = false; // 🔥 Прячем книгу

        this.movement.onStopMove = () => {
            this.movement.onStopMove = null;

            this.isSleepingState = true;
            this.preSleepRotationY = this.loadedModel.rotation.y;

            if (this.visualRoot) {
                this.visualRootPosFade = {
                    active: true,
                    progress: 0,
                    duration: this.sleepMoveDuration,
                    startZ: this.visualRoot.position.z,
                    targetZ: this.sleepOffsetZ,
                    startY: this.visualRoot.position.y,
                    targetY: this.sleepOffsetY
                };
            }

            const lieAction = this.sleepActions[0];
            const loopAction = this.sleepActions[1];

            lieAction.reset();
            lieAction.play();
            this.currentAction.crossFadeTo(lieAction, 0.5, true);
            this.currentAction = lieAction;

            const onFinish = (e) => {
                if (e.action === lieAction && this.isSleepingState) {
                    this.mixer.removeEventListener('finished', onFinish);
                    loopAction.reset();
                    loopAction.play();
                    lieAction.crossFadeTo(loopAction, 0.5, true);
                    this.currentAction = loopAction;

                    this.isReacting = false;
                }
            };
            this.mixer.addEventListener('finished', onFinish);
        };
        this.movement.moveToPoint('bed');
    }

    wakeUp() {
        if (this.sleepActions.length < 3 || !this.isSleepingState) return;

        this.isSleepingState = false;
        this.isReacting = true;

        if (this.bookMesh) this.bookMesh.visible = false; // На всякий случай

        const getUpAction = this.sleepActions[2];

        if (this.visualRoot) {
            this.visualRootPosFade = {
                active: true,
                progress: 0,
                duration: this.sleepMoveDuration,
                startZ: this.visualRoot.position.z,
                targetZ: 0,
                startY: this.visualRoot.position.y,
                targetY: 0
            };
        }

        getUpAction.reset();
        getUpAction.play();
        this.currentAction.crossFadeTo(getUpAction, 0.5, true);
        this.currentAction = getUpAction;

        const onWakeFinish = (e) => {
            if (e.action === getUpAction) {
                this.mixer.removeEventListener('finished', onWakeFinish);

                if (this.visualRootFade) this.visualRootFade.active = false;
                if (this.visualRootPosFade) this.visualRootPosFade.active = false;

                if (this.visualRoot) {
                    this.visualRoot.rotation.y = 0;
                    this.visualRoot.position.z = 0;
                    this.visualRoot.position.y = 0;
                }

                this.loadedModel.rotation.y += Math.PI;

                const nextAction = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];
                nextAction.reset();
                nextAction.play();
                this.currentAction.stop();
                this.currentAction = nextAction;

                this.movement.onStopMove = () => {
                    this.movement.onStopMove = null;
                    this.isReacting = false;

                    if (this.pendingTarget) {
                        const next = this.pendingTarget;
                        this.pendingTarget = null;
                        this.command(next);
                        return;
                    }

                    const finalIdle = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];
                    finalIdle.reset();
                    finalIdle.play();
                    this.currentAction.crossFadeTo(finalIdle, 0.5, true);
                    this.currentAction = finalIdle;

                    this.scheduleNextSwitch();
                };

                this.movement.moveToPoint('home');
            }
        };
        this.mixer.addEventListener('finished', onWakeFinish);
    }

    goToChairAndSit() {
        if (this.isChairState || this.isReacting || !this.movement) return;

        this.isReacting = true;
        clearTimeout(this.timerId);

        if (this.katanaMesh) this.katanaMesh.visible = false;
        if (this.bookMesh) this.bookMesh.visible = false; // 🔥 Прячем пока идем

        this.movement.onStopMove = () => {
            this.movement.onStopMove = null;

            this.isChairState = true;
            const sitAction = this.chairActions[0];
            const loopAction = this.chairActions[1];

            sitAction.reset();
            sitAction.play();
            this.currentAction.crossFadeTo(sitAction, 0.5, true);
            this.currentAction = sitAction;

            const onSitFinish = (e) => {
                if (e.action === sitAction && this.isChairState) {
                    this.mixer.removeEventListener('finished', onSitFinish);

                    loopAction.reset();
                    loopAction.play();
                    sitAction.crossFadeTo(loopAction, 0.5, true);
                    this.currentAction = loopAction;

                    // 🔥 ДОСТАЕТ КНИГУ как только уселся
                    if (this.bookMesh) this.bookMesh.visible = true;

                    this.isReacting = false;
                }
            };
            this.mixer.addEventListener('finished', onSitFinish);
        };
        this.movement.moveToPoint('chair');
    }

    standUpAndGoHome() {
        if (!this.isChairState || this.chairActions.length < 3) return;

        this.isChairState = false;
        this.isReacting = true;

        // 🔥 ПРЯЧЕТ КНИГУ сразу как начинает вставать
        if (this.bookMesh) this.bookMesh.visible = false;

        const getUpAction = this.chairActions[2];
        getUpAction.reset();
        getUpAction.play();
        this.currentAction.crossFadeTo(getUpAction, 0.5, true);
        this.currentAction = getUpAction;

        const onChairWakeFinish = (e) => {
            if (e.action === getUpAction) {
                this.mixer.removeEventListener('finished', onChairWakeFinish);

                this.movement.onStopMove = () => {
                    this.movement.onStopMove = null;
                    this.isReacting = false;

                    if (this.pendingTarget) {
                        const next = this.pendingTarget;
                        this.pendingTarget = null;
                        this.command(next);
                        return;
                    }

                    const finalIdle = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];
                    finalIdle.reset();
                    finalIdle.play();
                    this.currentAction.crossFadeTo(finalIdle, 0.5, true);
                    this.currentAction = finalIdle;

                    this.scheduleNextSwitch();
                };
                this.movement.moveToPoint('home');
            }
        };
        this.mixer.addEventListener('finished', onChairWakeFinish);
    }

    // 🔥 КАТАНА С ПЕРЕХОДОМ В КОНКРЕТНЫЙ IDLE
    playKatanaThenIdle(waypointName = 'home', specificIdleIndex = 0) {
        if (!this.movement || this.katanaActions.length === 0 || this.idleActions.length === 0) {
            console.warn("⚠️ Персонаж еще не загружен или отсутствуют анимации!");
            return;
        }

        this.isReacting = true;
        clearTimeout(this.timerId);

        // Перемещаем в нужную точку (например, 'finish')
        const wp = this.movement.waypoints[waypointName];
        if (wp) {
            this.loadedModel.position.set(wp.x, this.loadedModel.position.y, wp.z);
            this.loadedModel.rotation.y = wp.ry;
        }

        if (this.katanaMesh) this.katanaMesh.visible = true;
        if (this.bookMesh) this.bookMesh.visible = false;

        const randomIndex = Math.floor(Math.random() * this.katanaActions.length);
        const katanaAction = this.katanaActions[randomIndex];

        katanaAction.reset();
        katanaAction.setLoop(THREE.LoopOnce, 1);
        katanaAction.clampWhenFinished = true;
        katanaAction.play();

        if (this.currentAction) {
            this.currentAction.crossFadeTo(katanaAction, 0.3, true);
        }
        this.currentAction = katanaAction;
        this.currentReactionAction = katanaAction;

        const onKatanaFinished = (e) => {
            if (e.action === katanaAction) {
                this.mixer.removeEventListener('finished', onKatanaFinished);

                if (this.katanaMesh) this.katanaMesh.visible = false;

                // 🔥 Берем КОНКРЕТНЫЙ idle по индексу (или 0-й по умолчанию)
                const targetIdleIndex = specificIdleIndex < this.idleActions.length ? specificIdleIndex : 0;
                const idleAction = this.idleActions[targetIdleIndex];

                idleAction.reset();
                idleAction.setLoop(THREE.LoopRepeat);
                idleAction.play();

                katanaAction.crossFadeTo(idleAction, 0.5, true);
                this.currentAction = idleAction;
                this.currentReactionAction = null;
                this.isReacting = false;

                this.scheduleNextSwitch();
            }
        };

        this.mixer.addEventListener('finished', onKatanaFinished);
    }

    // 🔥 Метод для установки или обновления любой точки на лету
    setWaypoint(name, x, z, ry = 0) {
        if (!this.movement) return;
        this.movement.waypoints[name] = { x, z, ry };
    }
}