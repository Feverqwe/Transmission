exports.run = function (grunt) {
    grunt.registerTask('mono', function () {
        var browser = grunt.config('browser');


        var monoModule = require('mono');
        if (browser !== 'firefox') {
            browser = 'oldChrome';
        }

        var content = monoModule.get.mono(browser);

        grunt.file.write(grunt.template.process('<%= output %><%= vendor %><%= dataJsFolder %>mono.js'), content);
    });
};