// ==========================================
// ФАЙЛ: frontend/js/movement.js
// ==========================================

export class MovementEngine {
    constructor(model, waypoints = {}) {
        this.model = model;
        this.waypoints = waypoints;
        this.isMoving = false;

        // Хуки (коллбеки) для анимаций
        this.onStartMove = null;
        this.onStopMove = null;
    }

    addWaypoint(name, x, z, ry) {
        this.waypoints[name] = { x, z, ry };
    }

    moveToPoint(pointName) {
        if (!this.model || this.isMoving || !this.waypoints[pointName]) {
            return;
        }

        this.isMoving = true;
        const target = this.waypoints[pointName];

        const start = {
            x: this.model.position.x,
            z: this.model.position.z,
            ry: this.model.rotation.y
        };

        if (this.onStartMove) this.onStartMove();

        this.animateMovement(start, target, pointName, () => {
            this.isMoving = false;
            if (this.onStopMove) this.onStopMove();
        });
    }
animateMovement(start, target, pointName, onComplete) {
        const startTime = performance.now();

        // ⏱ НАСТРОЙКИ СКОРОСТИ (в миллисекундах)
        const initialTurnDuration = 300; // Фаза 1: Быстрый поворот в сторону движения
        const walkDuration = 2200;       // Фаза 2: Время ходьбы
        const finalTurnDuration = 250;   // Фаза 3: Быстрый поворот на точке (чтобы не маршировал на месте)

        const isChair = (pointName === 'chair');
        const chairFlipDuration = isChair ? 400 : 0;

        const totalDuration = initialTurnDuration + walkDuration + finalTurnDuration + chairFlipDuration;

        // 1. Вычисляем вектор и угол движения
        const dx = target.x - start.x;
        const dz = target.z - start.z;

        let moveAngle = start.ry;
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            moveAngle = Math.atan2(dx, dz);
        }

        let deltaMove = moveAngle - start.ry;
        while (deltaMove > Math.PI) deltaMove -= Math.PI * 2;
        while (deltaMove < -Math.PI) deltaMove += Math.PI * 2;
        moveAngle = start.ry + deltaMove;

        // 2. Вычисляем финальный поворот
        let deltaFinal = target.ry - moveAngle;
        while (deltaFinal > Math.PI) deltaFinal -= Math.PI * 2;
        while (deltaFinal < -Math.PI) deltaFinal += Math.PI * 2;
        const finalTargetRY = moveAngle + deltaFinal;

        const animateStep = (currentTime) => {
            const elapsed = currentTime - startTime;
            const totalProgress = Math.min(elapsed / totalDuration, 1);

            // ФАЗА 1: Разворот корпуса в сторону ходьбы
            if (elapsed < initialTurnDuration) {
                const p = elapsed / initialTurnDuration;
                const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
                this.model.rotation.y = start.ry + (moveAngle - start.ry) * ease;
            }
            // ФАЗА 2: Идем строго по прямой (🔥 ТЕПЕРЬ СТРОГО ЛИНЕЙНО)
            else if (elapsed < initialTurnDuration + walkDuration) {
                this.model.rotation.y = moveAngle;

                const p = (elapsed - initialTurnDuration) / walkDuration;

                // 🔥 Убрали замедление Math.pow. Теперь скорость равномерная от начала до конца!
                const ease = p;

                this.model.position.x = start.x + dx * ease;
                this.model.position.z = start.z + dz * ease;
            }
            // ФАЗА 3: Пришли на точку. Быстрый разворот к финальному углу
            else if (elapsed < initialTurnDuration + walkDuration + finalTurnDuration) {
                // Жестко фиксируем позицию, чтобы не уплыл
                this.model.position.x = target.x;
                this.model.position.z = target.z;

                const p = (elapsed - initialTurnDuration - walkDuration) / finalTurnDuration;
                const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
                this.model.rotation.y = moveAngle + (finalTargetRY - moveAngle) * ease;
            }
            // ФАЗА 4: Разворот спиной для посадки в кресло
            else if (isChair) {
                const chairElapsed = elapsed - (initialTurnDuration + walkDuration + finalTurnDuration);
                const p = Math.min(chairElapsed / chairFlipDuration, 1);
                const ease = p * p * (3.0 - 2.0 * p);
                this.model.rotation.y = finalTargetRY + (Math.PI * ease);
            }
            else {
                this.model.rotation.y = finalTargetRY;
            }

            if (totalProgress < 1) {
                requestAnimationFrame(animateStep);
            } else {
                // Фиксация в конце
                this.model.position.x = target.x;
                this.model.position.z = target.z;
                this.model.rotation.y = isChair ? finalTargetRY + Math.PI : finalTargetRY;

                // Срабатывает коллбек, и анимация ходьбы СРАЗУ переключается на Idle/Сон/Кресло
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animateStep);
    }
}