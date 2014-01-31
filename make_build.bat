del .\build.zip
del .\build.nex
rd /S /Q .\build
mkdir .\build

xcopy .\_locales .\build\_locales\ /E
xcopy .\js .\build\js\ /E
xcopy .\images .\build\images\ /E
xcopy .\css .\build\css\ /E
copy .\*.html .\build\.
copy .\*.json .\build\.

:: pathing
cd .\build\
..\patch -i ..\manager.patch manager.html
..\patch -i ..\manifest.patch manifest.json
..\patch -i ..\options.patch options.html
cd ..\.
:: 

:: make options.js
java -jar compiler.jar --js .\js\lang.js --js .\js\options.js --js_output_file .\build\js\options.js
:: make background.js
java -jar compiler.jar --js .\js\lang.js --js .\js\background.js --js_output_file .\build\js\background.js
:: make manager.js
java -jar compiler.jar --js .\js\notifer.js --js .\js\jquery.selectBox.js --js .\js\jquery.contextMenu.js --js .\js\manager.js --js_output_file .\build\js\manager.js
:: make stylesheet.css
copy .\css\stylesheet.css+.\css\jquery.contextMenu.css+.\css\jquery.selectBox.css .\build\css\stylesheet.css
:: clear
del .\build\js\notifer.js
del .\build\css\jquery.contextMenu.css
del .\build\js\jquery.contextMenu.js
del .\build\css\jquery.selectBox.css
del .\build\js\jquery.selectBox.js
del .\build\js\lang.js
:: 

java -jar yuicompressor-2.4.8.jar .\build\css\stylesheet.css -o .\build\css\stylesheet.css
java -jar yuicompressor-2.4.8.jar .\css\options.css -o .\build\css\options.css

java -jar htmlcompressor-1.5.3.jar -t html .\build\manager.html -o .\build\manager.html
java -jar htmlcompressor-1.5.3.jar -t html .\build\options.html -o .\build\options.html

7za a -tzip .\build.zip .\build\*
copy .\build.zip .\build.nex