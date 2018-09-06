/**
 * Load a text resource from a file over the network
 * 
 * @param {String} url Path to text resource
 * @param {Function} callback Called on completion
 */
var loadTextResource = function (url, callback) {
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.onload = function () {
		if (request.status < 200 || request.status > 299) {
			callback('Error: HTTP Status ' + request.status + ' on resource ' + url);
		} else {
			callback(null, request.responseText);
		}
	};
	request.send();
};

/**
 * Load an image resource
 * 
 * @param {String} url Path to image
 * @param {Function} callback Called on completion
 */
var loadImage = function (url, callback) {
	var image = new Image();
	image.onload = function () {
		callback(null, image);
	};
	image.src = url;
};

/**
 * Load a JSON resource over the network
 * 
 * @param {String} url Path to JSON resource
 * @param {Function} callback Called on completion
 */
var loadJSONResource = function (url, callback) {
	loadTextResource(url, function (err, result) {
		if (err) {
			callback(err);
		} else {
			try {
				callback(null, JSON.parse(result));
			} catch (e) {
				callback(e);
			}
		}
	});
};
