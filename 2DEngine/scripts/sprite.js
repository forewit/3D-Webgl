class Sprite {
    constructor(gl, img_url, vs, fs, options={}) {
        this.gl = gl;
        this.isLoaded = false;
        this.material = new Material(gl, vs, fs);

        this.size = new Point(64,64);
		if("width" in options){
			this.size.x = options.width * 1;
		}
		if("height" in options){
			this.size.y = options.height * 1;
        }
        
        this.image = new Image();
        this.image.src = img_url;
        this.image.sprite = this;
        this.image.onload = function() {
            this.sprite.setup();
        }
    }

    static createRectArray(x=0, y=0, w=1, h=1){
		return new Float32Array([
			x, y,
			x+w, y,
			x, y+h,
			x, y+h,
			x+w, y,
			x+w, y+h
		]);
	}

    setup() {
        let gl = this.gl;

        gl.useProgram(this.material.program);
        this.gl_tex = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, this.gl_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // maybe change to bilinear?
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // maybe change to bilinear
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
        gl.bindTexture(gl.TEXTURE_2D, null);

        this.uv_x = this.size.x / this.image.width;
		this.uv_y = this.size.y / this.image.height;

        this.tex_buff = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(0,0,this.uv_x,this.uv_y), gl.STATIC_DRAW);
    
        this.geo_buff = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(0,0,this.size.x,this.size.y), gl.STATIC_DRAW);
        
        gl.useProgram(null);
        this.isLoaded = true;
    }

    render(position, frames) {
        if (this.isLoaded) {
            let gl = this.gl;

            let frame_x = Math.floor(frames.x) * this.uv_x;
			let frame_y = Math.floor(frames.y) * this.uv_y;
			
            let objectMatrix = mat3.create();
            mat3.translate(objectMatrix, objectMatrix, [position.x, position.y]);

            gl.useProgram(this.material.program);
            
            gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.gl_tex);
			this.material.set("u_image", 0);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
			this.material.set("a_texCoord");
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
			this.material.set("a_position");
			
			this.material.set("u_frame", frame_x, frame_y);
			this.material.set("u_world", window.canvas.worldSpaceMatrix);
			this.material.set("u_object", objectMatrix);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);
            
            gl.useProgram(null);
        }
    }
}