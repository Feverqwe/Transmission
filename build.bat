rd /S /Q .\build
rd /S /Q .\build_firefox_sdk
mkdir .\build
mkdir .\build_firefox_sdk

xcopy .\_locales .\build\_locales\ /E
xcopy .\css .\build\css\ /E
xcopy .\images .\build\images\ /E
xcopy .\js .\build\js\ /E
copy .\*.html .\build\.
copy .\*.json .\build\.

:: firefox addon sdk
:: need create folder symbol link to addon-sdk\bin and run cfx xpi

mkdir .\build_firefox_sdk\data
xcopy .\build .\build_firefox_sdk\data\ /E
del .\build_firefox_sdk\data\manifest.json
xcopy .\firefox\* .\build_firefox_sdk\. /E /Y
xcopy .\js\background.js .\build_firefox_sdk\lib\. /E
del .\build_firefox_sdk\data\js\background.js

:: base

del .\build\sleep.html
del .\build\js\sleep.js

java -jar compiler.jar --jscomp_warning=const --js .\js\background.js --js_output_file .\build\js\background.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\graph.js --js_output_file .\build\js\graph.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\jquery.contextMenu.js --js_output_file .\build\js\jquery.contextMenu.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\manager.js --js_output_file .\build\js\manager.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\mono.js --js_output_file .\build\js\mono.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\notifer.js --js_output_file .\build\js\notifer.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\options.js --js_output_file .\build\js\options.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\selectBox.js --js_output_file .\build\js\selectBox.js

:: building

del .\build_chrome.zip

7za a -tzip .\build_chrome.zip .\build\*

pause

copy .\build_firefox_sdk\transmission_easy_client.xpi transmission_easy_client.xpi