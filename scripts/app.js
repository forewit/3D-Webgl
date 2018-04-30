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
        scene.AddModel('tree', './src/tree.json', './img/texture.png', function (){

            scene.models.tree.position([0,0,1]);

            var loop = function(dt) {
                var perSec = dt / 1000 * 2 * Math.PI;

                scene.camera.moveUp(0.01*perSec);
                scene.camera.getViewMatrix(scene.viewMatrix);
            };

            scene.Begin(loop);
        });
    });





};
