'use strict';

var scene;

var init = function () {
    var canvas = document.getElementById('webgl-surface');
    var gl = canvas.getContext('webgl');
    if (!gl) {
    	console.log('Failed to get WebGL context - trying experimental context');
    	gl = canvas.getContext('experimental-webgl');
    }
	if (!gl) {
    	alert('Your browser does not support WebGL - please use a different browser\nGoogleChrome works great!');
    	return;
    }

    scene = new Scene(gl);

    var redPos = [2, 0.8, 2];
    var bluePos = [3,0,2];
    var red = new PointLight(
        redPos,
        [0,0,0],
        [0.2, 0.2, 1],
        [0.2, 0.2, 1],
        [1.0, 0.045, 0.0075]
    );
    var blue = new PointLight(
        bluePos,
        [0,0,0],
        [1, 0.2, 0.2],
        [1, 0.2, 0.2],
        [1.0, 0.045, 0.0075]
    );

    scene.AddLight(red);
    scene.AddLight(blue);

    var test = new model(
        'test',
        './models/cube.json',
        './models/sphere.png',
        './models/sphere_specular.png',
        function() {
            scene.LoadModel(test);
        }
    )

    scene.AddModel('tree', './models/tree.json', './models/tree.png', './models/tree_specular.png', function (){
        scene.AddModel('cube', './models/cube.json', './models/cube.png', './models/cube_specular.png', function(){
            scene.AddModel('red', './models/sphere.json', './models/sphere.png', './models/sphere_specular.png', function(){
                scene.AddModel('blue', './models/sphere.json', './models/sphere.png', './models/sphere_specular.png', function(){

                    scene.models.tree.position([-2,-3,-5]);
                    scene.models.cube.position([-5, 0, 0]);
                    scene.models.red.position(redPos);
                    scene.models.blue.position(bluePos);

                    // Update loop
                    var loop = function(dt) {
                        var perSec = dt / 1000 * 2 * Math.PI;

                        mat4.rotate(scene.models.cube.world, scene.models.cube.world, 0.1*perSec, [0,1,0]);

                        //scene.camera.moveUp(0.02*perSec);
                        //scene.camera.getViewMatrix(scene.viewMatrix);
                    };

                    scene.Load( function (){
                        scene.Begin(loop);
                    });


                });


            });
        });
    });





};
