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
    scene.Load( function (){
        scene.AddModel('tree', './models/tree.json', './models/tree.png', './models/tree_specular.png', function (){
            scene.AddModel('cube', './models/cube.json', './models/cube.png', './models/cube_specular.png', function(){
                scene.AddModel('sphere', './models/sphere.json', './models/sphere.png', './models/sphere_specular.png', function(){
                    // Pre-loop setup
                    scene.models.tree.position([-2,-3,-5]);
                    scene.models.cube.position([0, 0, 0]);
                    scene.models.sphere.position(scene.pointLight.position);

                    // Update loop
                    var loop = function(dt) {
                        var perSec = dt / 1000 * 2 * Math.PI;

                        mat4.rotate(scene.models.cube.world, scene.models.cube.world, 0.1*perSec, [0,1,0]);

                        //scene.camera.moveUp(0.02*perSec);
                        //scene.camera.getViewMatrix(scene.viewMatrix);
                    };
                    scene.Begin(loop);
                });
            });

        });
    });





};
