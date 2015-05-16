exports.run = function (grunt) {
    grunt.registerTask('mono', function () {
        var browser = grunt.config('browser');

        var monoPath = './node_modules/mono/src/';

        var mono = grunt.file.read(monoPath + 'mono.js');

        var insertPosition = mono.indexOf('//@');
        var content = [mono.substr(0, insertPosition), mono.substr(insertPosition)];

        var monoVendorPath = monoPath + 'vendor/';
        var monoVendor;
        if (browser === 'firefox') {
            monoVendor = 'Firefox/';
        } else {
            monoVendor = 'Chrome/';
            content.splice(1, 0, grunt.file.read(monoVendorPath + 'Old' + monoVendor + 'messages.js'));
        }

        content.splice(1, 0, grunt.file.read(monoVendorPath + monoVendor + 'storage.js'));
        content.splice(1, 0, grunt.file.read(monoVendorPath + monoVendor + 'messages.js'));

        mono = content.join('\n');
        mono = mono.replace(/^\/\/.*\r?\n/gm, '');

        grunt.file.write(grunt.template.process('<%= output %><%= vendor %><%= dataJsFolder %>mono.js'), mono);
    });
};