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

cd ./build/.
#make options.js
cd ./js/.
cat lang.js > new_options.js
echo "" >> new_options.js
cat options.js >> new_options.js
cd ../
#make background.js
cd ./js/.
cat lang.js > new_background.js
echo "" >> new_background.js
cat background.js >> new_background.js
cd ../
#make manager.js
cd ./js/.
cat apprise-1.5.min.js > new_manager.js
echo "" >> new_manager.js
cat jquery.selectbox.js >> new_manager.js
echo "" >> new_manager.js
cat jquery.contextMenu.js >> new_manager.js
echo "" >> new_manager.js
cat jquery.tablesorter.js >> new_manager.js
echo "" >> new_manager.js
cat graph.js >> new_manager.js
echo "" >> new_manager.js
cat lang.js >> new_manager.js
echo "" >> new_manager.js
cat manager.js >> new_manager.js
cd ../
#make stylesheet.css
cd ./css/.
cat stylesheet.css > new_stylesheet.css
echo "" >> new_stylesheet.css
cat ../js/jquery.contextmenu.css >> new_stylesheet.css
echo "" >> new_stylesheet.css
cat ../js/jquery.selectbox.css >> new_stylesheet.css
echo "" >> new_stylesheet.css
cat apprise.min.css >> new_stylesheet.css
echo "" >> new_stylesheet.css
cd ../
#clear
rm ./js/apprise-1.5.min.js
rm ./js/graph.js
rm ./js/jquery.contextmenu.css
rm ./js/jquery.contextmenu.js
rm ./js/jquery.selectbox.css
rm ./js/jquery.selectbox.js
rm ./js/jquery.tablesorter.js
rm ./js/lang.js
rm ./css/apprise.min.css
#
cd ../

java -jar compiler.jar --js ./build/js/new_options.js --js_output_file ./build/js/options.js
java -jar compiler.jar --js ./build/js/new_background.js --js_output_file ./build/js/background.js
java -jar compiler.jar --js ./build/js/new_manager.js --js_output_file ./build/js/manager.js

java -jar yuicompressor-2.4.8.jar ./build/css/new_stylesheet.css -o ./build/css/stylesheet.css
java -jar yuicompressor-2.4.8.jar ./css/options.css -o ./build/css/options.css

java -jar htmlcompressor-1.5.3.jar -t html ./build/manager.html -o ./build/manager.html
java -jar htmlcompressor-1.5.3.jar -t html ./build/options.html -o ./build/options.html

rm ./build/js/new_options.js
rm ./build/js/new_background.js
rm ./build/js/new_manager.js
rm ./build/css/new_stylesheet.css

#rm ./build/js/new_options.js
#rm ./build/js/new_background.js
#rm ./build/js/new_manager.js
#rm ./build/js/new_stylesheet.css

cd ./build/.
zip -r ../build.zip ./
cd ..
cp build.zip build.nex