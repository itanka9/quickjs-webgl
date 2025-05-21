/**
 * Manual routines to add to the generated code.
 */

#include <GLUT/glut.h>
#include "quickjs/quickjs.h"

#ifdef WEBGL_DEBUG
#include <stdio.h>

static void debug_check_error(JSContext *ctx, const char *func, int argc, JSValueConst *argv) {
    GLenum err = glGetError();
    if (err != GL_NO_ERROR) {
        fprintf(stderr, "%s(", func);
        for (int i = 0; i < argc; i++) {
            const char *s = JS_ToCString(ctx, argv[i]);
            fprintf(stderr, "%s%s", s ? s : "<value>", i == argc - 1 ? "" : ", ");
            if (s) JS_FreeCString(ctx, s);
        }
        fprintf(stderr, ") -> %s (%d)\n", gluErrorString(err), err);
    }
}

#define DEBUG_GL_CHECK(ctx, name, argc, argv) debug_check_error(ctx, name, argc, argv)
#define DEBUG_GL_CHECK_RAW(name, fmt, ...)                                      \
    do {                                                                       \
        GLenum err = glGetError();                                             \
        if (err != GL_NO_ERROR) {                                              \
            fprintf(stderr, name "(" fmt ") -> %s (%d)\n",                  \
                    ##__VA_ARGS__, gluErrorString(err), err);                  \
        }                                                                      \
    } while (0)
#else
#define DEBUG_GL_CHECK(ctx, name, argc, argv)
#define DEBUG_GL_CHECK_RAW(name, fmt, ...)
#endif

#define window_width  640
#define window_height 480

int contextGot = 0;


JSValue func = JS_UNDEFINED;
JSContext *ctx;

void renderLoop () {
  if (!JS_IsFunction(ctx, func)) {
    return;
  }

  JSValue args = JS_UNDEFINED;

  JS_Call(ctx, func, JS_UNDEFINED, 0, &args);

  glutSwapBuffers();
  DEBUG_GL_CHECK_RAW("glutSwapBuffers", "");
}

/**
 * This function initializes the OpenGL context and returns 0 if successful.
 */
static JSValue js_getContext() 
{
    if (contextGot) {
      return JS_UNDEFINED;
    }

    int argc = 0;
    char *argv[1] = {""};

    glutInit(&argc, argv);
    DEBUG_GL_CHECK_RAW("glutInit", "%d, %p", argc, argv);
    glutInitWindowSize(window_width, window_height);
    DEBUG_GL_CHECK_RAW("glutInitWindowSize", "%d, %d", window_width, window_height);
    glutInitDisplayMode(GLUT_RGB | GLUT_DOUBLE);
    DEBUG_GL_CHECK_RAW("glutInitDisplayMode", "%d", GLUT_RGB | GLUT_DOUBLE);
    glutCreateWindow("QuickJS WebGL");
    DEBUG_GL_CHECK_RAW("glutCreateWindow", "\"%s\"", "QuickJS WebGL");
    glutDisplayFunc(renderLoop);
    DEBUG_GL_CHECK_RAW("glutDisplayFunc", "%p", renderLoop);
    glutIdleFunc(renderLoop);
    DEBUG_GL_CHECK_RAW("glutIdleFunc", "%p", renderLoop);

    contextGot = 1;

    return JS_UNDEFINED;
}

static JSValue js_start(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
  glutMainLoop();
  DEBUG_GL_CHECK_RAW("glutMainLoop", "");
  return JS_UNDEFINED;
}

static JSValue js_glShaderSource(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
    unsigned int a0; // shader
    if (JS_ToUint32(ctx, &a0, argv[0])) return JS_EXCEPTION;
    
    const char *a1; // source
	  a1 = JS_ToCString(ctx, argv[1]); if (!a1) return JS_EXCEPTION;
    int slen = strlen(a1);
    
    glShaderSource(a0, 1, &a1, &slen);
    DEBUG_GL_CHECK(ctx, "glShaderSource", argc, argv);

    return JS_UNDEFINED;
}

static JSValue js_glGetVertexAttribPointerv(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{   
    // glGetVertexAttribPointerv(a0,a1,a2);

    return JS_UNDEFINED;
}

static JSValue js_createBuffer(JSContext *ctx) {
  GLuint res;
  glGenBuffers(1, &res);
  DEBUG_GL_CHECK(ctx, "glGenBuffers", 0, NULL);

  return JS_NewInt32(ctx, res);
}

static JSValue js_requestAnimationFrame(JSContext *_ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
  if (!JS_IsFunction(ctx, argv[0])) {
    return JS_ThrowTypeError(ctx, "Argument must be a function");
  }

  func = argv[0];
  ctx = _ctx;

  return JS_UNDEFINED;
}

static JSValue js_errorString(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
  unsigned int error;
	if (JS_ToUint32(ctx, &error, argv[0])) return JS_EXCEPTION;

  const char *str = (const char *)gluErrorString(error);
  return JS_NewString(ctx, str);
}

#define LOG_BUFF_SIZE 4096

static char log_buff[LOG_BUFF_SIZE];

static JSValue js_glGetShaderInfoLog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
  unsigned int a0; // shader
	if (JS_ToUint32(ctx, &a0, argv[0])) return JS_EXCEPTION;
	
  unsigned int length;
        glGetShaderInfoLog(a0, LOG_BUFF_SIZE, &length, log_buff);
  DEBUG_GL_CHECK(ctx, "glGetShaderInfoLog", argc, argv);

  return JS_NewString(ctx, log_buff);
}

static JSValue js_glGetProgramInfoLog(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
  unsigned int a0; // program
	if (JS_ToUint32(ctx, &a0, argv[0])) return JS_EXCEPTION;
	
        unsigned int length = LOG_BUFF_SIZE;
        glGetProgramInfoLog(a0, LOG_BUFF_SIZE, &length, log_buff);
  DEBUG_GL_CHECK(ctx, "glGetProgramInfoLog", argc, argv);

  return JS_NewString(ctx, log_buff);
}

static JSValue js_glDrawElements(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
  unsigned int a0; // mode
	if (JS_ToUint32(ctx, &a0, argv[0])) return JS_EXCEPTION;
	
	unsigned int a1; // count
	if (JS_ToInt32(ctx, &a1, argv[1])) return JS_EXCEPTION;
	
	unsigned int a2; // type
	if (JS_ToUint32(ctx, &a2, argv[2])) return JS_EXCEPTION;
	
        unsigned int a3; // offset
        if (JS_ToUint32(ctx, &a3, argv[3])) return JS_EXCEPTION;

        glDrawElements(a0, a1, a2, a3);
  DEBUG_GL_CHECK(ctx, "glDrawElements", argc, argv);

  return JS_UNDEFINED;
}
