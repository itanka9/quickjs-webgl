QJS_DIST=quickjs-2024-01-13.tar.xz
QJS_DIR=quickjs

OBJDIR=$(QJS_DIR)/.obj
QJS_LIB_OBJS=$(OBJDIR)/quickjs.o $(OBJDIR)/libregexp.o $(OBJDIR)/libunicode.o $(OBJDIR)/cutils.o $(OBJDIR)/quickjs-libc.o $(OBJDIR)/libbf.o
QJS=$(QJS_DIR)/qjs
QJS_SRC=$(QJS_DIR)/qjs.c

# CFLAGS := -DWEBGL_DEBUG=2 -DJS_SHARED_LIBRARY
CFLAGS := -DJS_SHARED_LIBRARY
LDFLAGS := -shared -g -flto -Wno-everything -framework GLUT -framework OpenGL

webgl.so: webgl.c $(QJS_LIB_OBJS)
	clang $(CFLAGS) $(LDFLAGS) -o $@ $^

webgl.c: bindgen.js gl2.h additions.c $(QJS)
	$(QJS) bindgen.js > webgl.c

$(QJS): $(QJS_SRC) 
	cd $(QJS_DIR); make; cd ..

$(QJS_DIST): 
	wget https://bellard.org/quickjs/$(QJS_DIST)

$(QJS_SRC): $(QJS_DIST)
	mkdir -p $(QJS_DIR)
	tar xf $(QJS_DIST) -C $(QJS_DIR) --strip-components=1

clean:
	rm webgl.c webgl.so

test: $(QJS) webgl.so
	$(QJS) examples/test.js

rawgltf: $(QJS) webgl.so
	$(QJS) examples/rawgltf.js

distclean:
	make clean
	rm -fr quickjs $(QJS_DIST)