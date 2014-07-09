rd /S /Q .\build
rd /S /Q .\build_firefox_skd
mkdir .\build
mkdir .\build_firefox_skd

xcopy .\_locales .\build\_locales\ /E
xcopy .\css .\build\css\ /E
xcopy .\images .\build\images\ /E
xcopy .\js .\build\js\ /E
copy .\*.html .\build\.
copy .\*.json .\build\.

:: firefox addon sdk
:: need create folder symbol link to addon-sdk\bin and run cfx xpi

mkdir .\build_firefox_skd\data
xcopy .\build .\build_firefox_skd\data\ /E
rd /S /Q .\build_firefox_skd\data\_locales
del .\build_firefox_skd\data\manifest.json
xcopy .\firefox\* .\build_firefox_skd\. /E
xcopy .\js\background.js .\build_firefox_skd\lib\. /E
xcopy .\js\mono.js .\build_firefox_skd\lib\. /E
xcopy .\js\lang.js .\build_firefox_skd\lib\. /E
del .\build_firefox_skd\data\js\background.js
del .\build_firefox_skd\data\js\torrent_lib.js

:: base

del .\build\sleep.html
del .\build\js\sleep.js

java -jar compiler.jar --jscomp_warning=const --js .\js\background.js --js_output_file .\build\js\background.js
java -jar compiler.jar --js .\js\graph.js --js_output_file .\build\js\graph.js
java -jar compiler.jar --js .\js\jquery.contextMenu.js --js_output_file .\build\js\jquery.contextMenu.js
java -jar compiler.jar --js .\js\jquery.selectBox.js --js_output_file .\build\js\jquery.selectBox.js
java -jar compiler.jar --js .\js\lang.js --js_output_file .\build\js\lang.js
java -jar compiler.jar --js .\js\manager.js --js_output_file .\build\js\manager.js
java -jar compiler.jar --js .\js\mono.js --js_output_file .\build\js\mono.js
java -jar compiler.jar --js .\js\notifer.js --js_output_file .\build\js\notifer.js
java -jar compiler.jar --js .\js\options.js --js_output_file .\build\js\options.js

:: building

del .\build_chrome.zip

7za a -tzip .\build_chrome.zip .\build\*

pause

copy .\build_firefox_skd\transmission_easy_client.xpi transmission_easy_client.xpi