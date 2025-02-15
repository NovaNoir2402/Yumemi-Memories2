import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, FreeCamera, Vector3, HemisphericLight, MeshBuilder, PhysicsAggregate, PhysicsShapeType, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { PhysicsEngine, HavokPlugin } from "@babylonjs/core/Physics";
import HavokPhysics from "@babylonjs/havok";

class App {
    constructor() {
        this.initialize();
    }

    async initialize() {
        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // create the stamina bar
        var staminaBar = document.createElement("div");
        staminaBar.style.position = "absolute";
        staminaBar.style.bottom = "10px";
        staminaBar.style.left = "10px";
        staminaBar.style.width = "200px";
        staminaBar.style.height = "20px";
        staminaBar.style.backgroundColor = "gray";
        document.body.appendChild(staminaBar);

        var staminaFill = document.createElement("div");
        staminaFill.style.width = "100%";
        staminaFill.style.height = "100%";
        staminaFill.style.backgroundColor = "green";
        staminaBar.appendChild(staminaFill);

        // initialize babylon scene and engine
        var engine = new Engine(canvas, true);

        const havokInterface = await HavokPhysics();

        var createScene = function () {
            // This creates a basic Babylon Scene object (non-mesh)
            var scene = new Scene(engine);

            // This creates and positions a free camera (non-mesh)
            var camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

            // This targets the camera to scene origin
            camera.setTarget(Vector3.Zero());

            // This attaches the camera to the canvas
            camera.attachControl(canvas, true);

            // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
            var light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

            // Default intensity is 1. Let's dim the light a small amount
            light.intensity = 0.7;

            // Our built-in 'sphere' shape.
            var sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);

            // Move the sphere upward at 4 units
            sphere.position.y = 1;

            // Our built-in 'ground' shape.
            var ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);

            // Create walls
            var wall1 = MeshBuilder.CreateBox("wall1", { height: 10, width: 0.2, depth: 100 }, scene);
            wall1.position = new Vector3(50, 5, 0);

            var wall2 = MeshBuilder.CreateBox("wall2", { height: 10, width: 0.2, depth: 100 }, scene);
            wall2.position = new Vector3(-50, 5, 0);

            var wall3 = MeshBuilder.CreateBox("wall3", { height: 10, width: 100, depth: 0.2 }, scene);
            wall3.position = new Vector3(0, 5, 50);

            var wall4 = MeshBuilder.CreateBox("wall4", { height: 10, width: 100, depth: 0.2 }, scene);
            wall4.position = new Vector3(0, 5, -50);

            // Create an invisible roof
            var roof = MeshBuilder.CreateBox("roof", { height: 0.2, width: 100, depth: 100 }, scene);
            roof.position = new Vector3(0, 10.1, 0);
            roof.isVisible = false;

            // initialize plugin
            var hk = new HavokPlugin(undefined /* or the value that fits your usecase */, havokInterface);
            // enable physics in the scene with a gravity
            scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

            // Create a sphere shape and the associated body. Size will be determined automatically.
            var sphereAggregate = new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE, { mass: 1, restitution: 0 }, scene);

            // Create a static box shape.
            var groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);

            // Create wall aggregates
            var wall1Aggregate = new PhysicsAggregate(wall1, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);
            var wall2Aggregate = new PhysicsAggregate(wall2, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);
            var wall3Aggregate = new PhysicsAggregate(wall3, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);
            var wall4Aggregate = new PhysicsAggregate(wall4, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);
            var roofAggregate = new PhysicsAggregate(roof, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);

            // Add controls to the sphere
            var keys = [];
            scene.actionManager = new ActionManager(scene);

            scene.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, function (evt) {
                    keys[evt.sourceEvent.key] = true;
                })
            );

            scene.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, function (evt) {
                    keys[evt.sourceEvent.key] = false;
                })
            );

            var cameraAngle = 0;
            var cameraDistance = 10;
            var isGrounded = false;
            var stamina = 100;
            var maxStamina = 100;
            var staminaDrainRate = 0.5;
            var staminaRefillRate = 0.2;

            scene.onBeforeRenderObservable.add(() => {
                var velocity = new Vector3(0, 0, 0);
                var moveSpeed = 15; // AI DO NOT CHANGE THIS VALUE

                

                staminaFill.style.width = (stamina / maxStamina) * 100 + "%";

                if (isGrounded) {
                    if (keys["w"]) {
                        velocity.addInPlace(camera.getDirection(Vector3.Forward()).scale(moveSpeed));
                    }
                    if (keys["s"]) {
                        velocity.addInPlace(camera.getDirection(Vector3.Backward()).scale(moveSpeed));
                    }
                    if (keys["a"]) {
                        velocity.addInPlace(camera.getDirection(Vector3.Left()).scale(moveSpeed));
                    }
                    if (keys["d"]) {
                        velocity.addInPlace(camera.getDirection(Vector3.Right()).scale(moveSpeed));
                    }
                    if (keys["Shift"] && stamina > 0) {
                        moveSpeed *= 2;
                        stamina -= staminaDrainRate;
                        if (stamina < 0) stamina = 0;
                    } else {
                        stamina += staminaRefillRate;
                        if (stamina > maxStamina) stamina = maxStamina;
                    }

                    sphereAggregate.body.setLinearVelocity(velocity);
                }

                // Jump mechanic
                if (keys[" "] && isGrounded) {
                    sphereAggregate.body.applyImpulse(new Vector3(0, 10, 0), sphere.getAbsolutePosition());
                    isGrounded = false;
                }

                // Check if the sphere is on the ground
                if (sphere.position.y <= 1.1) {
                    isGrounded = true;
                }

                // Rotate camera around the sphere horizontally
                if (keys["ArrowLeft"]) {
                    cameraAngle -= 0.05;
                }
                if (keys["ArrowRight"]) {
                    cameraAngle += 0.05;
                }

                // Rotate camera up and down
                if (keys["ArrowUp"]) {
                    cameraDistance -= 0.1;
                    if (cameraDistance < 2) cameraDistance = 2; // Prevent getting too close
                }
                if (keys["ArrowDown"]) {
                    cameraDistance += 0.1;
                    if (cameraDistance > 20) cameraDistance = 20; // Prevent getting too far
                }

                var cameraX = sphere.position.x + cameraDistance * Math.sin(cameraAngle);
                var cameraZ = sphere.position.z + cameraDistance * Math.cos(cameraAngle);
                camera.position = new Vector3(cameraX, sphere.position.y + 5, cameraZ);
                camera.setTarget(sphere.position);
            });

            return scene;
        };

        var scene = createScene();

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === 'i') {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
        });
    }
}
new App();