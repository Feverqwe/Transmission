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
java -jar compiler.jar --js .\js\apprise-1.5.min.js --js .\js\jquery.selectbox.js --js .\js\jquery.contextMenu.js --js .\js\jquery.tablesorter.js --js .\js\graph.js --js .\js\lang.js --js .\js\manager.js --js_output_file .\build\js\manager.js
:: make stylesheet.css
copy .\css\stylesheet.css+.\js\jquery.contextmenu.css+.\js\jquery.selectbox.css+.\css\apprise.min.css .\build\css\stylesheet.css
:: clear
del .\build\js\apprise-1.5.min.js
del .\build\js\graph.js
del .\build\js\jquery.contextmenu.css
del .\build\js\jquery.contextmenu.js
del .\build\js\jquery.selectbox.css
del .\build\js\jquery.selectbox.js
del .\build\js\jquery.tablesorter.js
del .\build\js\lang.js
del .\build\css\apprise.min.css
:: 

java -jar yuicompressor-2.4.8.jar .\build\css\stylesheet.css -o .\build\css\stylesheet.css
java -jar yuicompressor-2.4.8.jar .\css\options.css -o .\build\css\options.css

java -jar htmlcompressor-1.5.3.jar -t html .\build\manager.html -o .\build\manager.html
java -jar htmlcompressor-1.5.3.jar -t html .\build\options.html -o .\build\options.html

7za a -tzip .\build.zip .\build\*
copy .\build.zip .\build.nex