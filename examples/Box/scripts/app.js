'use strict';

var scene;
var camera;

var init = function () {
    var canvas = document.getElementById('webgl-surface');
    scene = new Scene(canvas);

    camera = new Camera(
        glMatrix.toRadian(45),
		canvas.clientWidth / canvas.clientHeight,
		0.1,
        100.0
	);
    camera.orient(
        [-5,0,10],
        [0,0,0],
        [0,1,0]
    );
    var dirLight = new DirLight(
        [0, -1, 0],
        [0.2, 0.2, 0.2],
        [0.7, 0.7, 0.7],
        [0.7, 0.7, 0.7]
    );
    //scene.Add(dirLight);

    var pointLight = new PointLight(
        [0, 0, 0],
        [0,0,0],
        [1,1,0],
        [1,1,0],
        [1.0, 0.045, 0.0075]
    );
    scene.Add(pointLight);
    var sphere = new Model(
        './models/sphere.json',
        './models/sphere.png',
        './models/sphere_specular.png',
        function () {
            scene.Add(sphere);
            sphere.setPosition(pointLight.position);
        }
    );

    var pointLight2 = new PointLight(
        [3, 0, -3],
        [0,0,0],
        [0,1,1],
        [0,1,1],
        [1.0, 0.045, 0.0075]
    );
    scene.Add(pointLight2);
    var sphere2 = new Model(
        './models/sphere.json',
        './models/sphere.png',
        './models/sphere_specular.png',
        function () {
            scene.Add(sphere2);
            sphere2.setPosition(pointLight2.position);
        }
    );
    
    var c1 = new Model(
        './models/cube.json',
        './models/cube.png',
        './models/cube_specular.png',
        function () {
            scene.Add(c1);
            c1.setPosition([0, -3, 0]);
            c1.shine = 100;
        }
    );
    var c2 = new Model(
        './models/cube.json',
        './models/cube.png',
        './models/cube_specular.png',
        function () {
            scene.Add(c2);
            c2.setPosition([3, 0, 0]);
            c2.shine = 100;
        }
    );

    var t0 = performance.now();
    var loop = function (dt) {
        var perSec = (performance.now() - t0) / 1000;

        mat4.rotate(
            c1.world,
            c1.world,
            glMatrix.toRadian(20) * perSec,
            [1,0,0]
        )
        mat4.rotate(
            c2.world,
            c2.world,
            glMatrix.toRadian(20) * perSec,
            [0,1,0]
        )
        if (camera.position[2] > -10) {
            camera.position[2] -= 1 * perSec;
            camera.orient(camera.position, [0,0,0], [0,1,0]);
        }

        scene.Render(camera);
        t0 = performance.now();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};
