VS_01 = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    uniform mat3 u_world;
    uniform mat3 u_object;
    uniform vec2 u_frame;

    varying vec2 v_texCoord;
    void main(){
        gl_Position = vec4( u_world * u_object * vec3(a_position, 1), 1);
        v_texCoord = a_texCoord + u_frame;
    }
`;

FS_01 = `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;
    
    void main(){
        gl_FragColor = texture2D(u_image, v_texCoord);
    }
`;

class Canvas {
    constructor () {
        this.canvasElm = document.createElement("canvas");

        this.gl = this.canvasElm.getContext("webgl2");
        this.gl.clearColor(0.4,0.6,1.0,0);

        document.body.appendChild(this.canvasElm);

        this.worldSpaceMatrix = mat3.create();

        this.sprite = new Sprite(this.gl, "./img/fireball.png", VS_01, FS_01, {width:512, height:512});
    }

    resize(w, h) {
        this.canvasElm.width = w;
        this.canvasElm.height = h;

        mat3.identity(this.worldSpaceMatrix);
        mat3.translate(this.worldSpaceMatrix, this.worldSpaceMatrix, [-1, 1]);
        mat3.scale(this.worldSpaceMatrix, this.worldSpaceMatrix, [1/w, -1/h]);

        this.gl.viewport(0,0,this.canvasElm.width, this.canvasElm.height);
    }

    update() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.sprite.render(
            new Point(), // position
            new Point((new Date() * 0.01) % 6, 0) // frame (x,y)
        );


        this.gl.flush();
    }
}