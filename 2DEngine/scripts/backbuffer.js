class BackBuffer {
	constructor(gl, options){
		this.gl = gl;
		this.material = new Material(
			this.gl,
			BackBuffer.VS,
			BackBuffer.FS
		);
		this.size = new Point(512,512);
		
		if("width" in options ) {this.size.x = options.width; }
		if("height" in options ) {this.size.y = options.height; }
		
		this.fbuffer = gl.createFramebuffer();
		this.rbuffer = gl.createRenderbuffer();
		this.texture = gl.createTexture();
		
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.fbuffer );
		gl.bindRenderbuffer( gl.RENDERBUFFER, this.rbuffer );
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size.x, this.size.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.size.x, this.size.y);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rbuffer);
		
		//Create geometry for rendering
		this.tex_buff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
		gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(), gl.STATIC_DRAW);
		
		this.geo_buff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
		gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(-1,-1,2,2), gl.STATIC_DRAW);
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindTexture(gl.RENDERBUFFER, null);
		gl.bindTexture(gl.FRAMEBUFFER, null);
	}
	render(){
		let gl = this.gl;
		
		gl.useProgram(this.material.program);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		this.material.set("u_image", 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
		this.material.set("a_texCoord");
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
		this.material.set("a_position");
		
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);
		
		gl.useProgram(null);
	}
}
BackBuffer.VS = `
	attribute vec2 a_position;
	attribute vec2 a_texCoord;
	
	varying vec2 v_texCoord;
	void main(){
		gl_Position = vec4( a_position, 1, 1);
		v_texCoord = a_texCoord;
	}
`;
BackBuffer.FS = `
	precision mediump float;
	uniform sampler2D u_image;
	varying vec2 v_texCoord;
	
	void main(){
		gl_FragColor = texture2D(u_image, v_texCoord);
	}
`;