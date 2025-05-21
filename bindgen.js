import * as std from "std";

const disabledFunctions = {
    'glShaderSource': { argsCount: 2 },
    'glGetVertexAttribPointerv': { argsCount: 0 },
    'glGetShaderInfoLog': { argsCount: 1 },
    'glGetProgramInfoLog': { argsCount: 1 },
    'glDrawElements': { argsCount: 4 },
};

const additionsFunctions = {
    'getContext': 1,
    'createBuffer': 1,
    'errorString': 1,
    'requestAnimationFrame': 1,
    'glGetShaderInfoLog': 1,
    'glGetProgramInfoLog': 1,
    'glDrawElements': 1,
    'start': 1
}

const lines = std.loadFile('./gl2.h').split('\n');

const glConstRe = /#define\s+GL_(\S+)\s+(\S+)/;
const glProcRe = /GL_APICALL\s+(\S+)\s+GL_APIENTRY\s+(\S+)\s+\((.*?)\);/;

const moduleExports = [];
const moduleBody = [];

for (const name in additionsFunctions) {
    moduleExports.push(`JS_CFUNC_DEF("${name}", 0, js_${name})`);
}

for (const rawLine of lines) {
    const line = stripConst(rawLine);
    const constM = line.match(glConstRe);
    if (constM) {
        // TODO: Maybe export this to js module, not header
        const constDef = createConstDef(constM[1], constM[2]);
        if (constDef) {
            moduleExports.push(constDef);
        }
        continue;
    }
    const procM = line.match(glProcRe);
    if (procM) {
        const [exp, proc] = createProcDef(procM[2], procM[1], procM[3]);
        if (exp) {
            moduleExports.push(exp);
        }
        if (proc) {
            moduleBody.push(proc);
        }
    }
}

console.log(writeModule());

function stripConst(line) {
    return line.split(/\s+/).filter(x => x != 'const').join(' ');
}

function createConstDef(name, value) {
    return `JS_PROP_INT32_DEF("${name}", ${value}, 0 )`;
}

function createProcDef(name, retType, args) {
    const exportName = name[2].toLowerCase() + name.slice(3);
    const argsList = args.trim().split(/,\s+/);
    const callArgs = [];

    if (disabledFunctions[name]) {
        const argsCount = disabledFunctions[name].argsCount;
        return [`JS_CFUNC_DEF("${exportName}", ${argsCount}, js_${name})`, ''];

    }

    const body = [];
    const ret  = [];

    for (let i = 0; i < argsList.length; i++) {
        const parts = argsList[i].split(/\s+/);
        const [argType, argName] = parts;
        if (argType == 'void') {
            continue;
        }
        callArgs.push(`a${i}`);
        switch (argType) {
            case 'GLbyte':
                body.push(`khronos_int8_t a${i}; // ${argName}`);
                body.push(`if (JS_ToBool(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLubyte':
                body.push(`khronos_uint8_t a${i}; // ${argName}`);
                body.push(`if (JS_ToBool(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
            case 'GLboolean':
                body.push(`unsigned int a${i}; // ${argName}`);
                body.push(`a${i} = JS_ToBool(ctx, argv[${i}]);`);
                break;
            case 'GLushort':
                body.push(`unsigned short a${i}; // ${argName}`);
                body.push(`if (JS_ToUint32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLuint':
            case 'GLenum':
                body.push(`unsigned int a${i}; // ${argName}`);
                body.push(`if (JS_ToUint32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLfixed':
                body.push(`khronos_int32_t a${i}; // ${argName}`);
                body.push(`if (JS_ToInt32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLint':
            case 'GLbitfield':
                body.push(`int a${i}; // ${argName}`);
                body.push(`if (JS_ToInt32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLintptr':
                body.push(`khronos_intptr_t a${i}; // ${argName}`);
                body.push(`if (JS_ToInt32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLfloat':
            case 'GLclampf':
                body.push(`double _a${i}; // ${argName}`);
                body.push(`if (JS_ToFloat64(ctx, &_a${i}, argv[${i}])) return JS_EXCEPTION;`);
                body.push(`khronos_float_t a${i} = (float) _a${i};`)
                break;
            case 'GLsizei':
                body.push(`const khronos_ssize_t a${i}; // ${argName}`);
                body.push(`if (JS_ToInt32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLsizeiptr':
                body.push(`const khronos_ssize_t *a${i}; // ${argName}`);
                body.push(`if (JS_ToInt32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
                break;
            case 'GLchar*':
                body.push(`const char *a${i}; // ${argName}`);
                body.push(`a${i} = JS_ToCString(ctx, argv[${i}]); if (!a${i}) return JS_EXCEPTION;`);
                break;
            case 'GLenum*':
            case 'GLuint*':
                body.push(`const unsigned int *a${i}; // ${argName}`);
                body.push(`a${i} = JS_GetArrayBuffer(ctx, &a${i - 1}, argv[0]);`);
                break;
            case 'GLsizei*':
            case 'GLint*':
                body.push(`const int *a${i}; // ${argName}`);
                body.push(`a${i} = JS_GetArrayBuffer(ctx, &a${i - 1}, argv[0]);`);
                break;
            case 'GLfloat*':
                body.push(`const float *a${i}; // ${argName}`);
                body.push(`a${i} = JS_GetArrayBuffer(ctx, &a${i - 1}, argv[0]);`);
                break;    
            case 'GLboolean*':
            case 'GLvoid*':
                body.push(`const uint8_t *a${i}; // ${argName}`);
                body.push(`a${i} = JS_GetArrayBuffer(ctx, &a${i - 1}, argv[0]);`);
                break;
            case 'GLintptr':
                body.push(`const khronos_intptr_t *a${i}; // ${argName}`);
                body.push(`if (JS_ToInt32(ctx, &a${i}, argv[${i}])) return JS_EXCEPTION;`);
            default: 
                console.log(`${name}: Unknown argtype: ${argType} (${argName});`);
        }
        body.push('');
    }

    let hasResult = false;
    switch (retType) {
        case 'void':
            ret.push(`return JS_UNDEFINED;`);
            break;
        case 'GLenum':
        case 'GLuint':
        case 'int':
            hasResult = true;
            ret.push(`return JS_NewInt32(ctx, res);`);
            body.unshift(`int res;`)
            break;
        case 'GLboolean':
            hasResult = true;
            ret.push(`return JS_NewBool(ctx, res);`);
            body.unshift(`int res;`);
            break;
        case 'GLubyte*':
            hasResult = true;
            body.unshift(`const unsigned char *res;`);
            ret.push(`return JS_NewString(ctx, res);`);
            break;
    }


    if (hasResult) {
        body.push(`res = ${name}(${callArgs});`)
    } else {
        body.push(`${name}(${callArgs});`)
    }

    const proc = `static JSValue js_${name}(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
    ${body.join('\n\t')}

    ${ret.join('\n\t')}
}`;

    // convert names (glActiveTexture -> activeTexture)
    const moduleExport = `JS_CFUNC_DEF("${exportName}", ${argsList.length}, js_${name})`;

    return [moduleExport, proc];
}

function writeModule() {
    const template = `// Autogenerated with 'make webgl.c' command. All manual changes will be erased
#include "quickjs/quickjs.h"
#include "khrplatform.h"
#include <GLUT/glut.h>

#include "additions.c"

#define countof(x) (sizeof(x) / sizeof((x)[0]))

${moduleBody.join('\n\n')}

static const JSCFunctionListEntry js_webgl_funcs[] = {
    ${moduleExports.join(',\n\t')}
};

static int js_webgl_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_webgl_funcs,
                                    countof(js_webgl_funcs));
}

#ifdef JS_SHARED_LIBRARY
#define JS_INIT_MODULE js_init_module
#else
#define JS_INIT_MODULE js_init_module_webgl
#endif

JSModuleDef *JS_INIT_MODULE(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_webgl_init);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_webgl_funcs, countof(js_webgl_funcs));
    return m;
}`;
    return template;
}