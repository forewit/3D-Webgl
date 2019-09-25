VS_01 = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    varying vec2 v_texCoord;
    void main(){
        gl_Position = vec4(a_position, 1, 1);
        v_texCoord = a_texCoord;
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
        this.canvasElm.width = 800;
        this.canvasElm.height = 600;

        this.gl = this.canvasElm.getContext("webgl2");
        this.gl.clearColor(0.4,0.6,1.0,0);

        document.body.appendChild(this.canvasElm);

        this.sprite = new Sprite(this.gl, "./img/fireball.png", VS_01, FS_01);
    }

    update() {
        this.gl.viewport(0,0,this.canvasElm.width, this.canvasElm.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);


        this.sprite.render();


        this.gl.flush();
    }
}