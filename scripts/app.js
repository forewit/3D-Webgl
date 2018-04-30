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


    scene = new scene(gl);
    scene.__load();
    scene.__addModel('./src/tree.json','./img/texture.png');
    scene.begin();

/*
    scene = new scene(gl);
    scene.load(function (sceneLoadError) {
        if (sceneLoadError) {
            console.error(sceneLoadError);
        } else {
            scene.begin();
        }
    });
*/
};

// TODO: globalize scene / camera / lighting functions
// TODO: add "load new model function"
