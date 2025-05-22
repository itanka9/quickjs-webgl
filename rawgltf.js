import * as std from "std";
import * as gl from './webgl.so';
import * as mat4 from './js/mat4.js';

async function start() {
    //const canvas = document.getElementById('screen');
    //const gl = window.gl = canvas.getContext('webgl', { alpha: true });
    gl.getContext();
    if (!gl) {
        console.log('fuck');
        return;
    }

    gl.viewport(0, 0, 640, 480);

    //const gltfFile = await fetch('/box.gltf').then((r) => r.json());
    const gltfFile = std.parseExtJSON(std.loadFile('./assets/box.gltf'));
    // const buffers = await Promise.all(
    //     gltfFile.buffers.map((buffer) => fetch(buffer.uri).then((r) => r.arrayBuffer())),
    // );
    const buffers = gltfFile.buffers.map(({ byteLength, uri }) => {
        const ab = new ArrayBuffer(byteLength);
        const f = std.open('./assets/' + uri, 'r');
        f.read(ab, 0, byteLength);
        f.close();
        return ab;
    });

    const ctx = {
        gl,
        matrices: [mat4.create()],
        buffers,
        gltf: gltfFile,
    };

    const scene = gltfFile.scenes[gltfFile.scene];
    renderLoop(ctx, scene);
}

function renderLoop(ctx, scene) {
    let i = 0;

    function step() {
        console.log('frame ', i);
        i++;
        gl.clearColor(0, 0, 0.3 + 0.1 * (1 + Math.sin(i * Math.PI / 90)), 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        mat4.rotate(ctx.matrices[0], ctx.matrices[0], 0.05, [0.2, 0.3, 0.2]);

        drawNodes(ctx, scene.nodes);
    }

    gl.requestAnimationFrame(step);
    gl.start();
}

const glBuffers = [];

function useBuffer(ctx, accessor) {
    const gl = ctx.gl;
    const bufferView = ctx.gltf.bufferViews[accessor.bufferView];
    if (!glBuffers[accessor.bufferView]) {
        const buffer = gl.createBuffer();
        logError('createBuffer');
        if (!buffer) {
            return;
        }

        gl.bindBuffer(bufferView.target, buffer);
        logError('bindBuffer');
        const data = ctx.buffers[bufferView.buffer].slice(
            bufferView.byteOffset,
            bufferView.byteOffset + bufferView.byteLength,
        );
        gl.bufferData(
            bufferView.target,
            data.byteLength,
            data,
            gl.STATIC_DRAW,
        );
        logError('bufferData');
        gl.bindBuffer(bufferView.target, 0);
        glBuffers[accessor.bufferView] = buffer;
    } else {
        gl.bindBuffer(bufferView.target, glBuffers[accessor.bufferView]);
        logError('bindeBuffer');
    }
}

function drawNodes(ctx, nodes) {
    // const gl = ctx.gl;
    for (const i of nodes) {
        const node = ctx.gltf.nodes[i];
        if (node.matrix && node.children && node.children.length > 0) {
            ctx.matrices.push(node.matrix);
            drawNodes(ctx, node.children);
            ctx.matrices.pop();
        } else if (node.mesh !== undefined) {
            const mesh = ctx.gltf.meshes[node.mesh];
            for (const primitive of mesh.primitives) {
                const attributes = primitive.attributes;
                const program = useMaterial(gl, ctx, primitive.material);
                if (!program) {
                    continue;
                }
                let count = 0;
                for (const name in attributes) {
                    const accessor = ctx.gltf.accessors[attributes[name]];
                    const bufferView = ctx.gltf.bufferViews[accessor.bufferView];
                    useBuffer(ctx, accessor);

                    const attrLocation = gl.getAttribLocation(program, `a_${name.toLowerCase()}`);
                    if (attrLocation === -1) {
                        continue;
                    }

                    gl.enableVertexAttribArray(attrLocation);
                    logError('enableVertexAttribArray');
                    gl.vertexAttribPointer(
                        attrLocation,
                        channels(accessor.type),
                        accessor.componentType,
                        true,
                        bufferView.byteStride ?? 0,
                        bufferView.byteOffset + accessor.byteOffset,
                    );
                    logError('vertexAttribPointer');
                    count = Math.max(count, accessor.count);
                }

                let elementAccessor = null;
                if (primitive.indices !== undefined) {
                    const accessor = ctx.gltf.accessors[primitive.indices];
                    useBuffer(ctx, accessor);
                    elementAccessor = accessor;
                }

                const matrixLoc = gl.getUniformLocation(program, 'matrix');
                logError('getUniformLocation(matrix)');

                const mprod = new Float32Array(ctx.matrices[0]);
                
                for (let i = 1; i < ctx.matrices.length; i++) {
                    mat4.mul(mprod, mprod, ctx.matrices[i]);
                }
                gl.uniformMatrix4fv(matrixLoc, 1, false, mprod);
                logError('uniformMatrix4fv(matrix)');
                if (elementAccessor) {
                    gl.drawElements(
                        primitive.mode,
                        elementAccessor.count,
                        elementAccessor.componentType,
                        0,
                    );
                    logError('drawElements');
                } else {
                    gl.drawArrays(primitive.mode, 0, count);
                    logError('drawArrays');
                }
            }
        } else {
            console.log(`Cannot draw node ${JSON.stringify(node)}`);
        }
    }
}

const materialsSet = new Map();
function useMaterial(gl, ctx, materialIndex) {
    if (materialsSet.has(materialIndex)) {
        const program = materialsSet.get(materialIndex);
        gl.useProgram(program);
        logError('useProgram');
        return program;
    }
    const material = ctx.gltf.materials[materialIndex]
    if (material.pbrMetallicRoughness) {
        const materialConfig = material.pbrMetallicRoughness;
        const VSSRC = `attribute vec4 a_position;
        attribute vec4 a_normal;
        uniform mat4 matrix;
         
        void main() {
          gl_Position = matrix * a_position;
        }`;

        const FSSRC = `
        uniform vec4 color;
         
        void main() {
          gl_FragColor = color * vec4(gl_FragCoord.z, 1., 1., 1.);
        }`;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        if (!vs) {
            return;
        }
        gl.shaderSource(vs, VSSRC);
        gl.compileShader(vs);
        console.log(gl.getShaderInfoLog(vs));
        logError('compile vertex shader');

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fs) {
            return;
        }
        gl.shaderSource(fs, FSSRC);
        gl.compileShader(fs);
        console.log(gl.getShaderInfoLog(fs));
        logError('compile fragment shader');

        const program = gl.createProgram();
        if (!program) {
            return;
        }
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        console.log(gl.getProgramInfoLog(program));
        logError('linkProgram');
        gl.useProgram(program);
        logError('useProgram');

        const colorLoc = gl.getUniformLocation(program, 'color');
        gl.uniform4fv(colorLoc, materialConfig.baseColorFactor);
        logError('uniform4fv baseColor');
        materialsSet.set(materialIndex, program);
        return program;
    }
}

function channels(ats) {
    if (ats === 'SCALAR') {
        return 1;
    } else if (ats[0] === 'V') {
        return Number(ats[3]);
    }
    return 0;
}

function logError (msg) {
    const err = gl.getError();
    if (!err) {
        return;
    }
    console.log(`${msg}: ${gl.errorString(err)} (${err})`); 
}

start();