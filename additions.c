/**
 * Manual routines to add to the generated code.
 */

#include <GL/glew.h> // include GLEW and new version of GL on Windows
#include <GLFW/glfw3.h> // GLFW helper library for window management
#include "quickjs/quickjs.h"

int contextGot = 0;

/**
 * This function initializes the OpenGL context and returns 0 if successful.
 */
static JSValue js_getContext() 
{
    if (contextGot) return JS_EXCEPTION;

    // start GL context and O/S window using the GLFW helper library
    if (!glfwInit ()) {
      return JS_EXCEPTION;
    } 

    //Setting window properties
    glfwWindowHint (GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint (GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint (GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    glfwWindowHint (GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  
    //Actually create the window
    GLFWwindow* window = glfwCreateWindow (32, 32, "QuickC WebGL Window", NULL, NULL);
    if (!window) 
    {
      glfwTerminate();
      return JS_EXCEPTION;
    }
    glfwMakeContextCurrent (window);
                                  
    // start GLEW extension handler
    glewExperimental = GL_TRUE;
    glewInit();

    contextGot = 1;

    return JS_UNDEFINED;
}