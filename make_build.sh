#!/bin/sh
find . -name ".DS_Store" -exec rm {} \;
rm ./build.zip
rm ./build.nex
rm -r ./build
mkdir ./build
cp -r ./_locales ./build/.
cp -r ./js ./build/.
cp -r ./images ./build/.
cp -r ./css ./build/.
cp *.html ./build/.
cp *.json ./build/.

#pathing
cd ./build/.
patch < ../manager.patch
patch < ../manifest.patch
patch < ../options.patch
cd ..
#

#make stylesheet.css
cd ./build/css/.
cat jquery.contextMenu.css >> stylesheet.css
cat jquery.selectBox.css >> stylesheet.css
cd ../
#clear
rm ./js/notifer.js
rm ./css/jquery.contextMenu.css
rm ./js/jquery.contextMenu.js
rm ./css/jquery.selectBox.css
rm ./js/jquery.selectBox.js
rm ./js/lang.js
#
cd ../

java -jar compiler.jar --js ./js/lang.js --js ./js/options.js --js_output_file ./build/js/options.js
java -jar compiler.jar --js ./js/lang.js --js ./js/background.js --js_output_file ./build/js/background.js
java -jar compiler.jar --js ./js/notifer.js --js ./js/jquery.selectBox.js --js ./js/jquery.contextMenu.js --js ./js/manager.js --js_output_file ./build/js/manager.js
java -jar compiler.jar --js ./js/graph.js --js_output_file ./build/js/graph.js

java -jar yuicompressor-2.4.8.jar ./build/css/stylesheet.css -o ./build/css/stylesheet.css
java -jar yuicompressor-2.4.8.jar ./css/options.css -o ./build/css/options.css

java -jar htmlcompressor-1.5.3.jar -t html ./build/manager.html -o ./build/manager.html
java -jar htmlcompressor-1.5.3.jar -t html ./build/options.html -o ./build/options.html

rm ./build/css/stylesheet.css

cd ./build/.
zip -r ../build.zip ./
cd ..
cp build.zip build.nex