'use strict';

var scene;

var init = function () {
    var canvas = document.getElementById('webgl-surface');
    scene = new Scene();
    var r = new Renderer(canvas);



    var blueLight = new PointLight(
        [2, 0.8, 2],
        [0,0,0],
        [0.2, 0.2, 1],
        [0.2, 0.2, 1],
        [1.0, 0.045, 0.0075]
    );
    var redLight = new PointLight(
        [3,0,2],
        [0,0,0],
        [1, 0.2, 0.2],
        [1, 0.2, 0.2],
        [1.0, 0.045, 0.0075]
    );
    var camera = new Camera(
        Math.PI/4,
		canvas.clientWidth / canvas.clientHeight,
		0.1,
		100.0
	);
    camera.setPosition(
        [0,0,10],
        [0,0,0],
        [0,1,0]
    );

    var tree = new Model(
        './models/tree.json',
        './models/tree.png',
        './models/tree_specular.png',
        function () {
            scene.Add(tree);
        }
    );
    scene.Add(redLight);
    scene.Add(blueLight);


    var loop = function () {
        r.render(scene, camera);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};
