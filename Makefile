QJS_DIST=quickjs-2024-01-13.tar.xz
QJS_DIR=quickjs

OBJDIR=$(QJS_DIR)/.obj
QJS_LIB_OBJS=$(OBJDIR)/quickjs.o $(OBJDIR)/libregexp.o $(OBJDIR)/libunicode.o $(OBJDIR)/cutils.o $(OBJDIR)/quickjs-libc.o $(OBJDIR)/libbf.o
QJS=$(QJS_DIR)/qjs
QJS_SRC=$(QJS_DIR)/qjs.c

webgl.so: webgl.c $(QJS_LIB_OBJS)
	clang -shared -g -flto -Wno-everything -lglfw -lGLEW -framework OpenGL -DJS_SHARED_LIBRARY -o $@ $^

webgl.c: bindgen.js gl2.h additions.c $(QJS)
	$(QJS) bindgen.js > webgl.c

$(QJS): $(QJS_SRC) quickjs-2024-01-13.tar.xz
	cd $(QJS_DIR); make; cd ..

$(QJS_DIST): 
	wget https://bellard.org/quickjs/$(QJS_DIST)

download: $(QJS_DIST)
	mkdir -p $(QJS_DIR)
	tar xf $(QJS_DIST) -C $(QJS_DIR) --strip-components=1

clean:
	rm webgl.c webgl.so

test: $(QJS) webgl.so
	$(QJS) test.js

distclean:
	make clean
	rm -fr quickjs $(QJS_DIST)