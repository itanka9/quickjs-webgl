import * as GL from './webgl.so';

GL.getContext();
console.log(GL.getString(GL.RENDERER));
console.log(GL.getString(GL.VERSION));